import crypto from "crypto";
import mongoose, { ClientSession } from "mongoose";
import Booking from "./booking.model";
import BookingCounter from "./bookingCounter.model";
import WaitlistEntry from "./waitlist.model";
import AbandonedBooking from "./abandonedBooking.model";
import CapacityBucket from "../Scheduling/capacityBucket.model";
import {
  AbandonmentInput,
  AvailabilityInput,
  BookingQuoteInput,
  CreateBookingInput,
  ManageLookupInput,
  PublicCancelInput,
  PublicRescheduleInput,
  WaitlistInput,
} from "./booking.validation";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../lib/errors";
import { sendEmail } from "../../lib/mail.service";
import { bookingStatusTemplate } from "../../lib/templates/emailTemplates";
import Service, {
  DEFAULT_FREQUENCY_DISCOUNTS,
  DEFAULT_MINIMUM_PRICE,
  DEFAULT_PROPERTY_SIZE_ADJUSTMENTS,
} from "../Service/service.model";
import {
  getCapacityBucketKeys,
  getEffectiveCapacity,
  getOpeningHoursForDate,
  getSchedulingSettings,
} from "../Scheduling/scheduling.services";
import {
  addCalendarOccurrence,
  labelTime,
  minutesFromTime,
  timeFromMinutes,
  zonedDateTimeToUtc,
} from "../Scheduling/scheduling.time";
import { createStripeCheckoutSession } from "../Payment/stripe.service";
import { FRONTEND_URL, JWT_SECRET } from "../../config/ENV";
import { convertBookingLead, upsertLeadFromSource } from "../Lead/lead.services";
import { ensureJobForBooking } from "../FieldOps/fieldOps.services";
import { emitCustomerEvent } from "../Notification/notification.service";

const ACTIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED", "COMPLETED"];
const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const queueBookingNotification = async (booking: any, type: "BOOKING_RECEIVED" | "BOOKING_CONFIRMED" | "BOOKING_RESCHEDULED" | "BOOKING_CANCELLED", title: string, message: string, dedupeSuffix: string) => {
  try {
    await emitCustomerEvent({
      customerId: booking.customerId ? String(booking.customerId) : undefined,
      bookingId: String(booking._id),
      type,
      title,
      message,
      href: "/portal/bookings",
      email: booking.customerDetails?.email,
      phone: booking.customerDetails?.phone,
      smsText: `BIO Cleaning: ${message}`,
      dedupeKey: `${type.toLowerCase()}:${booking._id}:${dedupeSuffix}`,
    });
  } catch (error) {
    console.error("Failed to queue booking notification", type, error);
  }
};

const normalizeBookingDate = (value: string | Date) => {
  const raw = typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  return new Date(`${raw}T00:00:00.000Z`);
};

const nextBookingReference = async (session?: ClientSession) => {
  const counter = await BookingCounter.findByIdAndUpdate(
    "booking-reference",
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true, session },
  );
  return `BIO-${new Date().getUTCFullYear()}-${String(counter.sequence).padStart(6, "0")}`;
};

const parseDurationMinutes = (duration?: string) => {
  if (!duration) return 180;
  const lower = duration.toLowerCase();
  const hour = Number(lower.match(/([\d.]+)\s*h/)?.[1] || 0);
  const minute = Number(lower.match(/([\d.]+)\s*m/)?.[1] || 0);
  if (hour || minute) return Math.max(15, Math.round(hour * 60 + minute));
  const firstNumber = Number(lower.match(/[\d.]+/)?.[0] || 0);
  return firstNumber > 0 ? Math.max(15, firstNumber > 12 ? firstNumber : firstNumber * 60) : 180;
};

const propertyLabel = (property: any, legacy?: string) => {
  if (property?.propertyType === "OFFICE") {
    return property.squareFeet ? `Office · ${property.squareFeet.toLocaleString()} sq ft` : "Office";
  }
  if (property?.squareFeet && !property?.bedrooms && !property?.bathrooms) {
    return `${property.squareFeet.toLocaleString()} sq ft`;
  }
  if (property?.bedrooms !== undefined || property?.bathrooms !== undefined) {
    return `${property.bedrooms ?? 0}BR / ${property.bathrooms ?? 0}BA`;
  }
  return legacy || "Property";
};

const resolvePropertyAdjustment = (service: any, data: BookingQuoteInput) => {
  const pricing = service.pricing;
  const mode = pricing?.propertyPricingMode || "BED_BATH";
  let priceAdjustment = 0;
  let durationAdjustmentMinutes = 0;

  if (mode === "SQUARE_FOOTAGE" && data.property?.squareFeet !== undefined) {
    const squareFeet = data.property.squareFeet;
    const tier = (pricing?.squareFootageTiers || []).find(
      (item: any) =>
        squareFeet >= item.minSqFt && (item.maxSqFt === undefined || squareFeet <= item.maxSqFt),
    );
    if (!tier && (pricing?.squareFootageTiers || []).length) {
      throw new BadRequestError("This service does not have a pricing tier for the selected square footage");
    }
    priceAdjustment = tier?.priceAdjustment || 0;
    durationAdjustmentMinutes = tier?.durationAdjustmentMinutes || 0;
  } else if (mode === "BED_BATH" && (data.property?.bedrooms !== undefined || data.property?.bathrooms !== undefined)) {
    const bedrooms = data.property?.bedrooms || 0;
    const bathrooms = data.property?.bathrooms || 0;
    const includedBedrooms = pricing?.includedBedrooms ?? 1;
    const includedBathrooms = pricing?.includedBathrooms ?? 1;
    const extraBedrooms = Math.max(0, bedrooms - includedBedrooms);
    const extraBathrooms = Math.max(0, bathrooms - includedBathrooms);
    priceAdjustment =
      extraBedrooms * (pricing?.additionalBedroomPrice ?? 40) +
      extraBathrooms * (pricing?.additionalBathroomPrice ?? 25);
    durationAdjustmentMinutes =
      extraBedrooms * (pricing?.additionalBedroomMinutes ?? 30) +
      extraBathrooms * (pricing?.additionalBathroomMinutes ?? 20);
  } else if (data.propertySize) {
    const legacyAdjustments = pricing?.propertySizeAdjustments?.length
      ? pricing.propertySizeAdjustments
      : DEFAULT_PROPERTY_SIZE_ADJUSTMENTS;
    priceAdjustment = legacyAdjustments.find((item: any) => item.key === data.propertySize)?.amount ?? 0;
  }

  return { priceAdjustment: money(priceAdjustment), durationAdjustmentMinutes };
};

export const calculateBookingQuote = async (data: BookingQuoteInput) => {
  const service = await Service.findOne({ _id: data.serviceId, isActive: true });
  if (!service) throw new NotFoundError("Selected service is unavailable");

  const pricing = service.pricing;
  const minimumPrice = pricing?.minimumPrice ?? DEFAULT_MINIMUM_PRICE;
  const taxRate = pricing?.taxRate ?? 0;
  const frequencyDiscounts = pricing?.frequencyDiscounts?.length
    ? pricing.frequencyDiscounts
    : DEFAULT_FREQUENCY_DISCOUNTS;
  const { priceAdjustment: propertyAdjustment, durationAdjustmentMinutes } = resolvePropertyAdjustment(service, data);
  const frequencyDiscountPercent =
    frequencyDiscounts.find((item: any) => item.frequency === data.frequency)?.percent ?? 0;

  const requestedExtraCodes = [...new Set<string>((data.extraCodes || []) as string[])];
  const activeExtras = (pricing?.extras || []).filter((item: any) => item.isActive);
  const extras = requestedExtraCodes.map((code) => {
    const extra = activeExtras.find((item: any) => item.code.toUpperCase() === code.toUpperCase());
    if (!extra) throw new BadRequestError(`Invalid or unavailable extra: ${code}`);
    return {
      code: extra.code,
      name: extra.name,
      price: money(extra.price),
      durationMinutes: extra.durationMinutes || 0,
      additionalStaff: extra.additionalStaff || 0,
    };
  });

  const basePrice = money(service.basePrice);
  const priceBeforeFrequencyDiscount = money(Math.max(0, basePrice + propertyAdjustment));
  const discountedServicePrice = money(
    priceBeforeFrequencyDiscount * (1 - frequencyDiscountPercent / 100),
  );
  const serviceSubtotal = money(Math.max(minimumPrice, discountedServicePrice));
  const frequencyDiscountAmount = money(
    Math.max(0, priceBeforeFrequencyDiscount - serviceSubtotal),
  );
  const extrasTotal = money(extras.reduce((sum, extra) => sum + extra.price, 0));
  const subtotal = money(serviceSubtotal + extrasTotal);

  let promotionDiscount = 0;
  let appliedPromoCode: string | undefined;
  let promotionRedemption: { expectedCount: number; maxRedemptions?: number } | undefined;
  if (data.promoCode) {
    const now = new Date();
    const promo = (pricing?.promotions || []).find(
      (item: any) =>
        item.isActive &&
        item.code.toUpperCase() === data.promoCode!.toUpperCase() &&
        (!item.startsAt || item.startsAt <= now) &&
        (!item.endsAt || item.endsAt >= now) &&
        (!item.maxRedemptions || (item.redemptionCount || 0) < item.maxRedemptions),
    );
    if (!promo) throw new BadRequestError("Promotion code is invalid, expired, or fully redeemed");
    appliedPromoCode = promo.code;
    promotionRedemption = {
      expectedCount: promo.redemptionCount || 0,
      maxRedemptions: promo.maxRedemptions || undefined,
    };
    promotionDiscount = money(
      promo.type === "PERCENT"
        ? subtotal * (Math.min(100, promo.value) / 100)
        : Math.min(subtotal, promo.value),
    );
  }

  const taxableSubtotal = money(Math.max(0, subtotal - promotionDiscount));
  const taxAmount = money(taxableSubtotal * (taxRate / 100));
  const total = money(taxableSubtotal + taxAmount);
  const baseDuration = service.scheduling?.durationMinutes || parseDurationMinutes(service.duration);
  const durationMinutes = Math.max(
    15,
    baseDuration + durationAdjustmentMinutes + extras.reduce((sum, extra) => sum + extra.durationMinutes, 0),
  );
  const requiredStaff = Math.max(
    1,
    (service.scheduling?.requiredStaff || 1) + extras.reduce((sum, extra) => sum + extra.additionalStaff, 0),
  );
  const settings = await getSchedulingSettings();
  const depositAmount =
    settings.depositPolicy === "NONE"
      ? 0
      : money(
          settings.depositType === "PERCENT"
            ? total * (Math.min(100, settings.depositValue) / 100)
            : Math.min(total, settings.depositValue),
        );

  return {
    service,
    extras,
    promoCode: appliedPromoCode,
    promotionRedemption,
    propertyLabel: propertyLabel(data.property, data.propertySize),
    scheduling: {
      durationMinutes,
      requiredStaff,
      bufferBeforeMinutes: service.scheduling?.bufferBeforeMinutes || 0,
      bufferAfterMinutes: service.scheduling?.bufferAfterMinutes || 0,
      preparationInstructions: service.scheduling?.preparationInstructions || [],
    },
    payment: {
      depositPolicy: settings.depositPolicy,
      depositAmount,
      currency: settings.currency,
    },
    priceBreakdown: {
      basePrice,
      propertyAdjustment,
      minimumPrice: money(minimumPrice),
      serviceSubtotal,
      frequencyDiscountPercent,
      frequencyDiscountAmount,
      extrasTotal,
      subtotal,
      promotionDiscount,
      taxRate,
      taxAmount,
      total,
    },
  };
};

type EvaluatedSlot = {
  date: string;
  time: string;
  label: string;
  startAt: Date;
  endAt: Date;
  blockedStartAt: Date;
  blockedEndAt: Date;
  capacityBucketKeys: string[];
  effectiveCapacity: number;
  reservableCapacity: number;
  remainingCapacity: number;
  available: boolean;
};

const legacyTimeRangeMinutes = (timeSlot?: string) => {
  const value = String(timeSlot || "").trim().toLowerCase();
  if (!value) return null;

  if (value.includes("morning")) return { start: 8 * 60, end: 12 * 60 };
  if (value.includes("afternoon")) return { start: 12 * 60, end: 17 * 60 };
  if (value.includes("evening")) return { start: 17 * 60, end: 20 * 60 };

  const exact = value.match(/^(\d{1,2}):(\d{2})/);
  if (!exact) return null;
  const start = Number(exact[1]) * 60 + Number(exact[2]);
  // Legacy exact-time records did not preserve duration. Reserving one hour is a
  // safer compatibility window than consuming the entire business day.
  return { start, end: start + 60 };
};

const legacyUsageForRange = async (
  blockedStartAt: Date,
  blockedEndAt: Date,
  date: string,
  blockedStartMinutes: number,
  blockedEndMinutes: number,
  session?: ClientSession,
) => {
  const legacy = await Booking.find({
    status: { $in: ACTIVE_BOOKING_STATUSES },
    date: normalizeBookingDate(date),
    $or: [
      { capacityBucketKeys: { $exists: false } },
      { capacityBucketKeys: { $size: 0 } },
    ],
    $and: [
      {
        $or: [
          { blockedStartAt: { $lt: blockedEndAt }, blockedEndAt: { $gt: blockedStartAt } },
          { blockedStartAt: { $exists: false } },
        ],
      },
    ],
  })
    .select("requiredStaffSnapshot timeSlot blockedStartAt blockedEndAt")
    .session(session || null);

  return legacy.reduce((sum, booking: any) => {
    // Records that already carry precise boundaries are constrained by the query.
    if (booking.blockedStartAt && booking.blockedEndAt) {
      return sum + (booking.requiredStaffSnapshot || 1);
    }

    const range = legacyTimeRangeMinutes(booking.timeSlot);
    if (!range) return sum;
    const overlaps = range.start < blockedEndMinutes && range.end > blockedStartMinutes;
    return overlaps ? sum + (booking.requiredStaffSnapshot || 1) : sum;
  }, 0);
};

type SchedulingQuote = {
  scheduling: {
    durationMinutes: number;
    requiredStaff: number;
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
  };
};

const existingBookingSchedulingQuote = async (booking: any): Promise<SchedulingQuote> => {
  if (!booking.serviceId) throw new BadRequestError("This legacy booking does not have a service reference");
  const service = await Service.findById(booking.serviceId);
  if (!service) throw new NotFoundError("The service attached to this booking no longer exists");
  return {
    scheduling: {
      durationMinutes: booking.durationMinutes || service.scheduling?.durationMinutes || parseDurationMinutes(service.duration),
      requiredStaff: booking.requiredStaffSnapshot || service.scheduling?.requiredStaff || 1,
      bufferBeforeMinutes: service.scheduling?.bufferBeforeMinutes || 0,
      bufferAfterMinutes: service.scheduling?.bufferAfterMinutes || 0,
    },
  };
};

const evaluateSlot = async ({
  input,
  quote,
  date,
  time,
  session,
}: {
  input: BookingQuoteInput;
  quote: SchedulingQuote;
  date: string;
  time: string;
  session?: ClientSession;
}): Promise<EvaluatedSlot> => {
  const { settings, isClosed, hours } = await getOpeningHoursForDate(date);
  if (isClosed || !hours) {
    throw new ConflictError("The business is closed on the selected date");
  }

  const startMinutes = minutesFromTime(time);
  const endMinutes = startMinutes + quote.scheduling.durationMinutes;
  if (startMinutes < minutesFromTime(hours.start) || endMinutes > minutesFromTime(hours.end)) {
    throw new ConflictError("The selected time does not fit within business hours for this service duration");
  }

  const startAt = zonedDateTimeToUtc(date, time, settings.timezone);
  const endAt = new Date(startAt.getTime() + quote.scheduling.durationMinutes * 60_000);
  const blockedStartAt = new Date(
    startAt.getTime() - quote.scheduling.bufferBeforeMinutes * 60_000,
  );
  const blockedEndAt = new Date(
    endAt.getTime() +
      (quote.scheduling.bufferAfterMinutes + settings.defaultTravelBufferMinutes) * 60_000,
  );

  const now = Date.now();
  if (startAt.getTime() < now + settings.bookingLeadTimeHours * 60 * 60 * 1000) {
    throw new ConflictError("This appointment is inside the minimum booking lead time");
  }
  if (startAt.getTime() > now + settings.bookingHorizonDays * 24 * 60 * 60 * 1000) {
    throw new ConflictError("This appointment is beyond the current booking horizon");
  }

  const endLocal = timeFromMinutes(endMinutes);
  const effectiveCapacity = await getEffectiveCapacity({
    serviceId: input.serviceId,
    date,
    startTime: time,
    endTime: endLocal,
    blockedStartAt,
    blockedEndAt,
  });
  const blockedStartMinutes =
    startMinutes - quote.scheduling.bufferBeforeMinutes;
  const blockedEndMinutes =
    endMinutes + quote.scheduling.bufferAfterMinutes + settings.defaultTravelBufferMinutes;
  const legacyUsed = await legacyUsageForRange(
    blockedStartAt,
    blockedEndAt,
    date,
    blockedStartMinutes,
    blockedEndMinutes,
    session,
  );
  const reservableCapacity = Math.max(0, effectiveCapacity - legacyUsed);
  const capacityBucketKeys = getCapacityBucketKeys(
    blockedStartAt,
    blockedEndAt,
    settings.slotIntervalMinutes,
  );
  const bucketDocs = await CapacityBucket.find({ _id: { $in: capacityBucketKeys } })
    .select("_id usedUnits")
    .session(session || null);
  const maxBucketUsage = bucketDocs.reduce((max, bucket) => Math.max(max, bucket.usedUnits || 0), 0);
  const remainingCapacity = Math.max(0, reservableCapacity - maxBucketUsage);

  return {
    date,
    time,
    label: labelTime(time),
    startAt,
    endAt,
    blockedStartAt,
    blockedEndAt,
    capacityBucketKeys,
    effectiveCapacity,
    reservableCapacity,
    remainingCapacity,
    available: remainingCapacity >= quote.scheduling.requiredStaff,
  };
};

const getAvailability = async (data: AvailabilityInput) => {
  const quote = await calculateBookingQuote(data);
  const { settings, isClosed, hours } = await getOpeningHoursForDate(data.date);
  if (isClosed || !hours) {
    return {
      date: data.date,
      timezone: settings.timezone,
      durationMinutes: quote.scheduling.durationMinutes,
      requiredStaff: quote.scheduling.requiredStaff,
      slots: [],
      closed: true,
    };
  }

  const open = minutesFromTime(hours.start);
  const close = minutesFromTime(hours.end);
  const latestStart = close - quote.scheduling.durationMinutes;
  const candidates: string[] = [];
  for (let minute = open; minute <= latestStart; minute += settings.slotIntervalMinutes) {
    candidates.push(timeFromMinutes(minute));
  }

  const settled = await Promise.all(
    candidates.map(async (time) => {
      try {
        return await evaluateSlot({ input: data, quote, date: data.date, time });
      } catch {
        return null;
      }
    }),
  );

  return {
    date: data.date,
    timezone: settings.timezone,
    durationMinutes: quote.scheduling.durationMinutes,
    requiredStaff: quote.scheduling.requiredStaff,
    slots: settled
      .filter((slot): slot is EvaluatedSlot => Boolean(slot?.available))
      .map((slot) => ({
        time: slot.time,
        label: slot.label,
        startAt: slot.startAt,
        endAt: slot.endAt,
        remainingCapacity: slot.remainingCapacity,
      })),
    closed: false,
  };
};

const reserveCapacity = async (
  slot: EvaluatedSlot,
  requiredStaff: number,
  session: ClientSession,
) => {
  for (const key of slot.capacityBucketKeys) {
    await CapacityBucket.updateOne(
      { _id: key },
      { $setOnInsert: { usedUnits: 0 } },
      { upsert: true, session },
    );
    const result = await CapacityBucket.updateOne(
      { _id: key, usedUnits: { $lte: Math.max(0, slot.reservableCapacity - requiredStaff) } },
      { $inc: { usedUnits: requiredStaff } },
      { session },
    );
    if (result.modifiedCount !== 1) {
      throw new ConflictError("This time no longer has enough crew capacity. Please choose another slot.");
    }
  }
};

const releaseCapacity = async (
  bucketKeys: string[] | undefined,
  requiredStaff: number | undefined,
  session?: ClientSession,
) => {
  if (!bucketKeys?.length) return;
  const units = Math.max(1, requiredStaff || 1);
  await CapacityBucket.updateMany(
    { _id: { $in: bucketKeys } },
    { $inc: { usedUnits: -units } },
    { session },
  );
  await CapacityBucket.deleteMany(
    { _id: { $in: bucketKeys }, usedUnits: { $lte: 0 } },
    { session },
  );
};

const hashManageToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

const managementTokenForSession = (bookingSessionId?: string) =>
  bookingSessionId
    ? crypto
        .createHmac("sha256", JWT_SECRET)
        .update(`booking-management:${bookingSessionId}`)
        .digest("hex")
    : crypto.randomBytes(32).toString("hex");

const verifyManageToken = (booking: any, token: string) => {
  const expected = booking.managementTokenHash;
  const actual = hashManageToken(token);
  if (!expected || expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
};

const sanitizeManagedBooking = (booking: any) => {
  const object = booking.toObject ? booking.toObject() : { ...booking };
  delete object.managementTokenHash;
  delete object.capacityBucketKeys;
  return object;
};

const cancellationPolicySnapshot = (settings: any) => ({
  noticeHours: settings.cancellationNoticeHours,
  rescheduleNoticeHours: settings.rescheduleNoticeHours,
  allowLateCancellation: settings.allowLateCancellation,
  lateCancellationFeePercent: settings.lateCancellationFeePercent,
});

const getBookingOccurrences = async (primary: any) => {
  if (!primary.recurrenceGroupId) return [primary];
  return Booking.find({ recurrenceGroupId: primary.recurrenceGroupId }).sort({ occurrenceIndex: 1 });
};

const ensureCheckoutForSeries = async ({
  primary,
  occurrences,
  idempotencyKey,
}: {
  primary: any;
  occurrences: any[];
  idempotencyKey: string;
}) => {
  if (primary.payment?.option !== "DEPOSIT" || primary.payment?.status === "PAID") {
    return { checkoutUrl: undefined as string | undefined, paymentError: undefined as string | undefined };
  }
  if (primary.payment?.status === "PENDING" && primary.payment?.checkoutUrl) {
    return { checkoutUrl: primary.payment.checkoutUrl as string, paymentError: undefined };
  }

  const amount = money(
    occurrences.reduce((sum, occurrence) => sum + Number(occurrence.payment?.depositAmount || 0), 0),
  );
  if (amount <= 0) {
    return { checkoutUrl: undefined, paymentError: undefined };
  }

  try {
    const checkout = await createStripeCheckoutSession({
      reference: primary.reference,
      recurrenceGroupId: primary.recurrenceGroupId,
      customerEmail: primary.customerDetails.email,
      amount,
      currency: primary.payment.currency,
      idempotencyKey,
    });
    const filter = primary.recurrenceGroupId
      ? { recurrenceGroupId: primary.recurrenceGroupId }
      : { _id: primary._id };
    await Booking.updateMany(filter, {
      $set: {
        "payment.status": "PENDING",
        "payment.checkoutSessionId": checkout.id,
        "payment.checkoutUrl": checkout.url,
      },
      $inc: { "payment.attempt": 1 },
    });
    occurrences.forEach((booking) => {
      booking.payment.status = "PENDING";
      booking.payment.checkoutSessionId = checkout.id;
      booking.payment.checkoutUrl = checkout.url;
      booking.payment.attempt = Number(booking.payment.attempt || 0) + 1;
    });
    return { checkoutUrl: checkout.url, paymentError: undefined };
  } catch (error: any) {
    const filter = primary.recurrenceGroupId
      ? { recurrenceGroupId: primary.recurrenceGroupId }
      : { _id: primary._id };
    await Booking.updateMany(filter, {
      $set: { "payment.status": "FAILED" },
      $unset: { "payment.checkoutUrl": "" },
    });
    occurrences.forEach((booking) => {
      booking.payment.status = "FAILED";
      booking.payment.checkoutUrl = undefined;
    });
    return {
      checkoutUrl: undefined,
      paymentError: error?.message || "Deposit checkout could not be started",
    };
  }
};

const replayBookingSession = async (bookingSessionId: string) => {
  const primary = await Booking.findOne({ bookingSessionId });
  if (!primary) return null;
  const occurrences = await getBookingOccurrences(primary);
  const manageToken = managementTokenForSession(bookingSessionId);
  const payment = await ensureCheckoutForSeries({
    primary,
    occurrences,
    idempotencyKey: `booking-deposit:${bookingSessionId}`,
  });
  await AbandonedBooking.findOneAndUpdate(
    { sessionId: bookingSessionId },
    {
      $set: {
        state: "CONVERTED",
        stage: "CONFIRMED",
        bookingReference: primary.reference,
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    },
    { upsert: false },
  );
  return {
    booking: sanitizeManagedBooking(primary),
    occurrences: occurrences.map(sanitizeManagedBooking),
    manageToken,
    ...payment,
  };
};

const createBooking = async (
  data: CreateBookingInput,
  options: { forcePayLater?: boolean; trustedPriceBreakdown?: Record<string, number> } = {},
) => {
  if (data.bookingSessionId) {
    const replay = await replayBookingSession(data.bookingSessionId);
    if (replay) return replay;
  }

  const quote = await calculateBookingQuote(data);
  const settings = await getSchedulingSettings();
  // Accepted estimates carry a frozen, server-created commercial snapshot. Only
  // internal server callers can provide this override; browser payloads never can.
  if (options.trustedPriceBreakdown) {
    const frozenTotal = money(Number(options.trustedPriceBreakdown.total));
    if (!Number.isFinite(frozenTotal) || frozenTotal < 0) {
      throw new BadRequestError("Accepted estimate has an invalid price snapshot");
    }
    quote.priceBreakdown = { ...quote.priceBreakdown, ...options.trustedPriceBreakdown, total: frozenTotal };
    quote.payment.depositAmount =
      settings.depositPolicy === "NONE"
        ? 0
        : money(
            settings.depositType === "PERCENT"
              ? frozenTotal * (Math.min(100, settings.depositValue) / 100)
              : Math.min(frozenTotal, settings.depositValue),
          );
  }
  const occurrenceCount =
    data.frequency === "ONE_TIME"
      ? 1
      : Math.min(data.occurrenceCount || 1, settings.recurrenceMaxOccurrences);
  const paymentOption = options.forcePayLater
    ? "PAY_LATER"
    : settings.depositPolicy === "REQUIRED"
      ? "DEPOSIT"
      : settings.depositPolicy === "NONE"
        ? "PAY_LATER"
        : data.paymentOption;
  if (
    quote.promotionRedemption?.maxRedemptions &&
    quote.promotionRedemption.expectedCount + occurrenceCount > quote.promotionRedemption.maxRedemptions
  ) {
    throw new ConflictError("This promotion does not have enough remaining redemptions for the selected recurring series");
  }
  const recurrenceGroupId = occurrenceCount > 1 ? crypto.randomUUID() : undefined;
  const manageToken = managementTokenForSession(data.bookingSessionId);
  const managementTokenHash = hashManageToken(manageToken);
  const session = await mongoose.startSession();
  let created: any[] = [];
  let idempotencyConflict = false;

  try {
    await session.withTransaction(async () => {
      const attemptCreated: any[] = [];
      for (let index = 0; index < occurrenceCount; index += 1) {
        const occurrenceDate = addCalendarOccurrence(data.date, data.frequency, index);
        const slot = await evaluateSlot({
          input: data,
          quote,
          date: occurrenceDate,
          time: data.timeSlot,
          session,
        });
        if (!slot.available) {
          throw new ConflictError(`There is not enough crew capacity on ${occurrenceDate} at ${data.timeSlot}`);
        }
        await reserveCapacity(slot, quote.scheduling.requiredStaff, session);
        const reference = await nextBookingReference(session);
        const booking = new Booking({
          reference,
          serviceId: quote.service._id,
          serviceType: quote.service.name,
          propertySize: quote.propertyLabel,
          property: data.property,
          date: normalizeBookingDate(occurrenceDate),
          timeSlot: data.timeSlot,
          startAt: slot.startAt,
          endAt: slot.endAt,
          blockedStartAt: slot.blockedStartAt,
          blockedEndAt: slot.blockedEndAt,
          businessTimezone: settings.timezone,
          durationMinutes: quote.scheduling.durationMinutes,
          requiredStaffSnapshot: quote.scheduling.requiredStaff,
          capacityBucketKeys: slot.capacityBucketKeys,
          frequency: data.frequency,
          recurrenceGroupId,
          bookingSessionId: index === 0 ? data.bookingSessionId : undefined,
          occurrenceIndex: index,
          occurrenceCount,
          extras: quote.extras.map(({ additionalStaff: _a, ...extra }) => extra),
          promoCode: quote.promoCode,
          customerDetails: data.customerDetails,
          notes: data.notes,
          priceBreakdown: quote.priceBreakdown,
          totalAmount: quote.priceBreakdown.total,
          status: "PENDING",
          managementTokenHash,
          cancellationPolicy: cancellationPolicySnapshot(settings),
          payment: {
            option: paymentOption,
            status: paymentOption === "DEPOSIT" ? "UNPAID" : "NOT_REQUIRED",
            depositAmount: paymentOption === "DEPOSIT" ? quote.payment.depositAmount : 0,
            currency: settings.currency,
          },
        });
        await booking.save({ session });
        attemptCreated.push(booking);
      }

      if (quote.promoCode && quote.promotionRedemption) {
        const expectedCount = quote.promotionRedemption.expectedCount;
        const promotionMatch: any = { code: quote.promoCode };
        if (expectedCount === 0) {
          promotionMatch.$or = [
            { redemptionCount: 0 },
            { redemptionCount: { $exists: false } },
            { redemptionCount: null },
          ];
        } else {
          promotionMatch.redemptionCount = expectedCount;
        }
        const promoUpdate = await Service.updateOne(
          {
            _id: quote.service._id,
            "pricing.promotions": { $elemMatch: promotionMatch },
          },
          { $inc: { "pricing.promotions.$.redemptionCount": occurrenceCount } },
          { session },
        );
        if (promoUpdate.modifiedCount !== 1) {
          throw new ConflictError("This promotion changed while the booking was being reserved. Please refresh the quote and try again.");
        }
      }

      await WaitlistEntry.updateMany(
        {
          serviceId: quote.service._id,
          requestedDate: data.date,
          "customer.email": data.customerDetails.email.toLowerCase(),
          status: { $in: ["WAITING", "NOTIFIED"] },
        },
        { $set: { status: "BOOKED" } },
        { session },
      );

      // withTransaction may retry the callback. Only expose documents from the
      // latest successful attempt so aborted retries cannot leak stale objects.
      created = attemptCreated;
    });
  } catch (error: any) {
    if (data.bookingSessionId && error?.code === 11000) {
      idempotencyConflict = true;
    } else {
      throw error;
    }
  } finally {
    await session.endSession();
  }

  if (idempotencyConflict && data.bookingSessionId) {
    const replay = await replayBookingSession(data.bookingSessionId);
    if (replay) return replay;
    throw new ConflictError("This booking request is already being processed. Please retry once.");
  }

  const primary = created[0];
  if (!primary) throw new ConflictError("The booking could not be reserved. Please retry.");

  try {
    const converted = await convertBookingLead({
      bookingSessionId: data.bookingSessionId,
      bookingReference: primary.reference,
      name: data.customerDetails.name,
      email: data.customerDetails.email,
      phone: data.customerDetails.phone,
      address: {
        ...data.customerDetails.address,
        propertyType: data.property?.propertyType,
      },
      value: quote.priceBreakdown.total * occurrenceCount,
      occurredAt: primary.createdAt || new Date(),
    });
    if (converted?.customer?._id) {
      const filter = recurrenceGroupId ? { recurrenceGroupId } : { _id: primary._id };
      await Booking.updateMany(filter, { $set: { customerId: converted.customer._id } });
      created.forEach((booking) => { booking.customerId = converted.customer._id; });
    }
  } catch (error) {
    console.error("Booking was created but CRM customer/lead synchronization failed:", error);
  }

  try {
    await Promise.all(created.map((booking) => ensureJobForBooking(booking)));
  } catch (error) {
    console.error("Booking was created but field job synchronization failed:", error);
  }

  const payment = await ensureCheckoutForSeries({
    primary,
    occurrences: created,
    idempotencyKey: `booking-deposit:${data.bookingSessionId || recurrenceGroupId || primary.reference}`,
  });
  const checkoutUrl = payment.checkoutUrl;
  const paymentError = payment.paymentError;

  if (data.bookingSessionId) {
    await AbandonedBooking.findOneAndUpdate(
      { sessionId: data.bookingSessionId },
      {
        $set: {
          state: "CONVERTED",
          stage: "CONFIRMED",
          bookingReference: primary.reference,
          lastActivityAt: new Date(),
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      },
      { upsert: false },
    );
  }

  const manageUrl = FRONTEND_URL
    ? `${FRONTEND_URL.replace(/\/$/, "")}/booking/manage?reference=${encodeURIComponent(primary.reference)}#token=${manageToken}`
    : undefined;
  await queueBookingNotification(
    primary,
    "BOOKING_RECEIVED",
    `Booking received · ${primary.reference}`,
    `We received your ${quote.service.name} booking for ${data.date} at ${labelTime(data.timeSlot)}.${occurrenceCount > 1 ? ` This series includes ${occurrenceCount} visits.` : ""}`,
    String(primary.createdAt?.getTime?.() || Date.now()),
  );

  return {
    booking: sanitizeManagedBooking(primary),
    occurrences: created.map(sanitizeManagedBooking),
    manageToken,
    checkoutUrl,
    paymentError,
  };
};

const getQuote = async (data: BookingQuoteInput) => {
  const quote = await calculateBookingQuote(data);
  return {
    serviceId: String(quote.service._id),
    serviceName: quote.service.name,
    extras: quote.extras.map(({ additionalStaff: _a, ...extra }) => extra),
    promoCode: quote.promoCode,
    priceBreakdown: quote.priceBreakdown,
    totalAmount: quote.priceBreakdown.total,
    propertyLabel: quote.propertyLabel,
    durationMinutes: quote.scheduling.durationMinutes,
    requiredStaff: quote.scheduling.requiredStaff,
    preparationInstructions: quote.scheduling.preparationInstructions,
    payment: quote.payment,
  };
};

const getAllBookings = async (query: any) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  const skip = (page - 1) * limit;
  const filter: any = {};
  if (query.search) {
    const escaped = String(query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { reference: { $regex: escaped, $options: "i" } },
      { "customerDetails.name": { $regex: escaped, $options: "i" } },
      { "customerDetails.email": { $regex: escaped, $options: "i" } },
      { "customerDetails.phone": { $regex: escaped, $options: "i" } },
    ];
  }
  if (query.status) filter.status = query.status;
  const [bookings, total] = await Promise.all([
    Booking.find(filter).sort({ startAt: -1, createdAt: -1 }).skip(skip).limit(limit),
    Booking.countDocuments(filter),
  ]);
  return { bookings, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
};

const getBookingById = async (id: string) => {
  const booking = await Booking.findById(id);
  if (!booking) throw new NotFoundError("Booking not found");
  return booking;
};

const adminPagination = (query: any) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

const getAdminWaitlist = async (query: any) => {
  const { page, limit, skip } = adminPagination(query);
  const filter: any = {};
  if (query.status) filter.status = query.status;
  if (query.date) filter.requestedDate = String(query.date);
  const [entries, total] = await Promise.all([
    WaitlistEntry.find(filter)
      .populate("serviceId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    WaitlistEntry.countDocuments(filter),
  ]);
  return { entries, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
};

const getAdminAbandonedBookings = async (query: any) => {
  const { page, limit, skip } = adminPagination(query);
  const filter: any = {};
  if (query.state) {
    filter.state = query.state;
  } else {
    filter.$or = [
      { state: "ABANDONED" },
      { state: "ACTIVE", lastActivityAt: { $lte: new Date(Date.now() - 30 * 60 * 1000) } },
    ];
  }
  if (query.hasContact === "true") {
    filter.$and = [
      {
        $or: [
          { "customer.email": { $exists: true, $ne: "" } },
          { "customer.phone": { $exists: true, $ne: "" } },
        ],
      },
    ];
  }
  const [entries, total] = await Promise.all([
    AbandonedBooking.find(filter)
      .populate("serviceId", "name")
      .sort({ lastActivityAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AbandonedBooking.countDocuments(filter),
  ]);
  return { entries, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
};

const notifyWaitlistForOpening = async (booking: any) => {
  if (!booking.serviceId) return;
  const requestedDate = normalizeBookingDate(booking.date).toISOString().slice(0, 10);
  const entries = await WaitlistEntry.find({
    serviceId: booking.serviceId,
    requestedDate,
    status: "WAITING",
  })
    .sort({ createdAt: 1 })
    .limit(10);
  if (!entries.length) return;
  await Promise.allSettled(
    entries.map(async (entry) => {
      await sendEmail(
        entry.customer.email,
        `A BIO Cleaning opening may be available on ${requestedDate}`,
        `A spot may now be available on ${requestedDate}. Visit our booking page to check live availability.`,
      );
      entry.status = "NOTIFIED";
      entry.notifiedAt = new Date();
      await entry.save();
    }),
  );
};

const updateBookingStatus = async (id: string, status: any) => {
  const session = await mongoose.startSession();
  let booking: any;
  let openedCapacity = false;
  try {
    await session.withTransaction(async () => {
      const current = await Booking.findById(id).session(session);
      if (!current) throw new NotFoundError("Booking not found");
      if (current.status === status) {
        booking = current;
        return;
      }

      const wasCancelled = current.status === "CANCELLED";
      const willCancel = status === "CANCELLED";
      if (!wasCancelled && willCancel) {
        await releaseCapacity(current.capacityBucketKeys, current.requiredStaffSnapshot, session);
        openedCapacity = true;
      } else if (
        wasCancelled &&
        (status === "PENDING" || status === "CONFIRMED") &&
        current.startAt &&
        current.businessTimezone
      ) {
        if (!current.serviceId) {
          throw new BadRequestError(
            "Legacy bookings without a service reference cannot be reactivated. Create or reschedule the booking using the scheduling engine instead.",
          );
        }
        const quote = await existingBookingSchedulingQuote(current);
        const date = normalizeBookingDate(current.date).toISOString().slice(0, 10);
        const slot = await evaluateSlot({
          input: {
            serviceId: String(current.serviceId),
            property: current.property as any,
            propertySize: current.propertySize,
            frequency: current.frequency,
            extraCodes: current.extras.map((extra: any) => extra.code),
          },
          quote,
          date,
          time: current.timeSlot,
          session,
        });
        if (!slot.available) {
          throw new ConflictError("This booking can no longer be reactivated because the original slot is full");
        }
        await reserveCapacity(slot, quote.scheduling.requiredStaff, session);
        current.capacityBucketKeys = slot.capacityBucketKeys;
      }

      current.status = status;
      await current.save({ session });
      booking = current;
    });
  } finally {
    await session.endSession();
  }

  if (!booking) throw new NotFoundError("Booking not found");
  if (openedCapacity) void notifyWaitlistForOpening(booking);

  if (booking.status === "CONFIRMED") {
    await queueBookingNotification(booking, "BOOKING_CONFIRMED", `Booking confirmed · ${booking.reference}`, `Your ${booking.serviceType} booking ${booking.reference} is confirmed for ${booking.timeSlot}.`, String(booking.updatedAt?.getTime?.() || Date.now()));
  } else if (booking.status === "CANCELLED") {
    await queueBookingNotification(booking, "BOOKING_CANCELLED", `Booking cancelled · ${booking.reference}`, `Your booking ${booking.reference} has been cancelled.`, String(booking.updatedAt?.getTime?.() || Date.now()));
  }
  try { await ensureJobForBooking(booking); } catch (error) { console.error("Booking updated but field job synchronization failed:", error); }
  return booking;
};

const getBookedSlots = async (date: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) throw new BadRequestError("Date must use YYYY-MM-DD format");
  const bookings = await Booking.find({
    date: normalizeBookingDate(date),
    status: { $in: ACTIVE_BOOKING_STATUSES },
  }).select("timeSlot");
  return [...new Set(bookings.map((booking) => booking.timeSlot))];
};

const joinWaitlist = async (data: WaitlistInput) => {
  const service = await Service.exists({ _id: data.serviceId, isActive: true });
  if (!service) throw new NotFoundError("Selected service is unavailable");
  const entry = await WaitlistEntry.findOneAndUpdate(
    {
      serviceId: data.serviceId,
      requestedDate: data.requestedDate,
      "customer.email": data.customer.email.toLowerCase(),
      status: { $in: ["WAITING", "NOTIFIED"] },
    },
    {
      $set: {
        preferredTime: data.preferredTime,
        frequency: data.frequency,
        property: data.property,
        extraCodes: data.extraCodes,
        customer: { ...data.customer, email: data.customer.email.toLowerCase() },
        status: "WAITING",
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return entry;
};

const captureAbandonment = async (data: AbandonmentInput) => {
  const entry = await AbandonedBooking.findOneAndUpdate(
    { sessionId: data.sessionId },
    {
      $set: {
        ...data,
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      $setOnInsert: { sessionId: data.sessionId },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  const hasContact = Boolean(data.customer?.email || data.customer?.phone);
  if (hasContact && entry.state !== "CONVERTED") {
    try {
      const service = data.serviceId ? await Service.findById(data.serviceId).select("name basePrice").lean() : null;
      const lead = await upsertLeadFromSource({
        name: data.customer?.name || "Booking inquiry",
        email: data.customer?.email || undefined,
        phone: data.customer?.phone || undefined,
        source: "BOOKING_ABANDONMENT",
        referenceId: data.sessionId,
        requestedServiceId: data.serviceId,
        requestedServiceName: service?.name,
        value: Number(service?.basePrice || 0),
        message: `Booking journey paused at ${data.stage}${data.requestedDate ? ` for ${data.requestedDate}` : ""}.`,
        abandonedBookingId: String(entry._id),
      });
      if (!entry.leadId || String(entry.leadId) !== String(lead._id)) {
        entry.leadId = lead._id as any;
        await entry.save();
      }
    } catch (error) {
      console.error("Failed to sync abandoned booking into lead pipeline:", error);
    }
  }

  return entry;
};

const managedBooking = async ({ reference, manageToken }: ManageLookupInput) => {
  const booking = await Booking.findOne({ reference }).select("+managementTokenHash");
  if (!booking || !verifyManageToken(booking, manageToken)) {
    throw new NotFoundError("Booking management link is invalid or expired");
  }
  return booking;
};

const getManagedBooking = async (data: ManageLookupInput) => sanitizeManagedBooking(await managedBooking(data));

const cancelManagedBooking = async (data: PublicCancelInput) => {
  // Authenticate before starting a transaction so invalid links fail quickly.
  await managedBooking(data);
  const session = await mongoose.startSession();
  let cancelledBooking: any;
  let didCancel = false;
  try {
    await session.withTransaction(async () => {
      const booking = await Booking.findOne({ reference: data.reference })
        .select("+managementTokenHash")
        .session(session);
      if (!booking || !verifyManageToken(booking, data.manageToken)) {
        throw new NotFoundError("Booking management link is invalid or expired");
      }
      if (booking.status === "CANCELLED") {
        cancelledBooking = booking;
        return;
      }
      if (booking.status === "COMPLETED") {
        throw new BadRequestError("Completed bookings cannot be cancelled");
      }

      const startAt = booking.startAt || normalizeBookingDate(booking.date);
      const hoursUntilStart = (startAt.getTime() - Date.now()) / 3_600_000;
      const policy = booking.cancellationPolicy;
      if (policy && hoursUntilStart < policy.noticeHours && !policy.allowLateCancellation) {
        throw new BadRequestError(`This booking requires at least ${policy.noticeHours} hours notice to cancel online`);
      }
      if (policy && hoursUntilStart < policy.noticeHours && policy.allowLateCancellation) {
        booking.cancellationFee = money(booking.totalAmount * (policy.lateCancellationFeePercent / 100));
      }

      await releaseCapacity(booking.capacityBucketKeys, booking.requiredStaffSnapshot, session);
      booking.status = "CANCELLED";
      if (data.reason) {
        booking.notes = [booking.notes, `Cancellation reason: ${data.reason}`].filter(Boolean).join("\n");
      }
      await booking.save({ session });
      cancelledBooking = booking;
      didCancel = true;
    });
  } finally {
    await session.endSession();
  }

  if (!cancelledBooking) throw new NotFoundError("Booking not found");
  if (didCancel) void notifyWaitlistForOpening(cancelledBooking);
  try { await ensureJobForBooking(cancelledBooking); } catch (error) { console.error("Cancelled booking job sync failed:", error); }
  if (didCancel) await queueBookingNotification(cancelledBooking, "BOOKING_CANCELLED", `Booking cancelled · ${cancelledBooking.reference}`, `Your booking ${cancelledBooking.reference} has been cancelled.`, String(cancelledBooking.updatedAt?.getTime?.() || Date.now()));
  return sanitizeManagedBooking(cancelledBooking);
};

const rescheduleManagedBooking = async (data: PublicRescheduleInput) => {
  // Authenticate before the transaction, then re-read and re-authorize inside it
  // so transaction retries never reuse stale booking/capacity state.
  await managedBooking(data);
  const session = await mongoose.startSession();
  let rescheduledBooking: any;
  let oldOpening: { date: Date; timeSlot: string } | undefined;

  try {
    await session.withTransaction(async () => {
      const booking = await Booking.findOne({ reference: data.reference })
        .select("+managementTokenHash")
        .session(session);
      if (!booking || !verifyManageToken(booking, data.manageToken)) {
        throw new NotFoundError("Booking management link is invalid or expired");
      }
      if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
        throw new BadRequestError("Only active upcoming bookings can be rescheduled");
      }

      const startAt = booking.startAt || normalizeBookingDate(booking.date);
      const hoursUntilStart = (startAt.getTime() - Date.now()) / 3_600_000;
      if (booking.cancellationPolicy && hoursUntilStart < booking.cancellationPolicy.rescheduleNoticeHours) {
        throw new BadRequestError(`This booking requires at least ${booking.cancellationPolicy.rescheduleNoticeHours} hours notice to reschedule online`);
      }
      if (!booking.serviceId) {
        throw new BadRequestError("This legacy booking must be recreated before it can use online rescheduling");
      }

      const quoteInput: BookingQuoteInput = {
        serviceId: String(booking.serviceId),
        property: booking.property as any,
        propertySize: booking.propertySize,
        frequency: booking.frequency,
        extraCodes: booking.extras.map((extra) => extra.code),
      };
      const quote = await existingBookingSchedulingQuote(booking);
      const oldDate = normalizeBookingDate(booking.date);
      const oldTimeSlot = booking.timeSlot;

      await releaseCapacity(booking.capacityBucketKeys, booking.requiredStaffSnapshot, session);
      const slot = await evaluateSlot({
        input: quoteInput,
        quote,
        date: data.date,
        time: data.timeSlot,
        session,
      });
      if (!slot.available) throw new ConflictError("The requested replacement time is no longer available");
      await reserveCapacity(slot, quote.scheduling.requiredStaff, session);

      booking.date = normalizeBookingDate(data.date);
      booking.timeSlot = data.timeSlot;
      booking.startAt = slot.startAt;
      booking.endAt = slot.endAt;
      booking.blockedStartAt = slot.blockedStartAt;
      booking.blockedEndAt = slot.blockedEndAt;
      booking.capacityBucketKeys = slot.capacityBucketKeys;
      booking.durationMinutes = quote.scheduling.durationMinutes;
      booking.requiredStaffSnapshot = quote.scheduling.requiredStaff;
      await booking.save({ session });

      rescheduledBooking = booking;
      if (oldDate.toISOString().slice(0, 10) !== data.date || oldTimeSlot !== data.timeSlot) {
        oldOpening = { date: oldDate, timeSlot: oldTimeSlot };
      }
    });
  } finally {
    await session.endSession();
  }

  if (!rescheduledBooking) throw new NotFoundError("Booking not found");
  if (oldOpening) {
    void notifyWaitlistForOpening({
      ...rescheduledBooking.toObject(),
      date: oldOpening.date,
      timeSlot: oldOpening.timeSlot,
    });
  }
  try { await ensureJobForBooking(rescheduledBooking); } catch (error) { console.error("Rescheduled booking job sync failed:", error); }
  await queueBookingNotification(rescheduledBooking, "BOOKING_RESCHEDULED", `Booking rescheduled · ${rescheduledBooking.reference}`, `Your booking ${rescheduledBooking.reference} is now scheduled for ${data.date} at ${labelTime(data.timeSlot)}.`, `${data.date}:${data.timeSlot}`);
  return sanitizeManagedBooking(rescheduledBooking);
};

const cancelCustomerBooking = async (customerId: string, bookingId: string, reason?: string) => {
  const session = await mongoose.startSession();
  let cancelledBooking: any;
  let didCancel = false;
  try {
    await session.withTransaction(async () => {
      const booking: any = await Booking.findOne({ _id: bookingId, customerId }).session(session);
      if (!booking) throw new NotFoundError("Booking not found");
      if (booking.status === "CANCELLED") { cancelledBooking = booking; return; }
      if (booking.status === "COMPLETED") throw new BadRequestError("Completed bookings cannot be cancelled");
      const startAt = booking.startAt || normalizeBookingDate(booking.date);
      const hoursUntilStart = (startAt.getTime() - Date.now()) / 3_600_000;
      const policy = booking.cancellationPolicy;
      if (policy && hoursUntilStart < policy.noticeHours && !policy.allowLateCancellation) {
        throw new BadRequestError(`This booking requires at least ${policy.noticeHours} hours notice to cancel online`);
      }
      if (policy && hoursUntilStart < policy.noticeHours && policy.allowLateCancellation) {
        booking.cancellationFee = money(booking.totalAmount * (policy.lateCancellationFeePercent / 100));
      }
      await releaseCapacity(booking.capacityBucketKeys, booking.requiredStaffSnapshot, session);
      booking.status = "CANCELLED";
      if (reason) booking.notes = [booking.notes, `Cancellation reason: ${reason}`].filter(Boolean).join("\n");
      await booking.save({ session });
      cancelledBooking = booking;
      didCancel = true;
    });
  } finally { await session.endSession(); }
  if (!cancelledBooking) throw new NotFoundError("Booking not found");
  if (didCancel) void notifyWaitlistForOpening(cancelledBooking);
  try { await ensureJobForBooking(cancelledBooking); } catch (error) { console.error("Cancelled booking job sync failed:", error); }
  if (didCancel) await queueBookingNotification(cancelledBooking, "BOOKING_CANCELLED", `Booking cancelled · ${cancelledBooking.reference}`, `Your booking ${cancelledBooking.reference} has been cancelled.`, String(cancelledBooking.updatedAt?.getTime?.() || Date.now()));
  return sanitizeManagedBooking(cancelledBooking);
};

const rescheduleCustomerBooking = async (customerId: string, bookingId: string, date: string, timeSlot: string) => {
  const session = await mongoose.startSession();
  let rescheduledBooking: any;
  let oldOpening: { date: Date; timeSlot: string } | undefined;
  try {
    await session.withTransaction(async () => {
      const booking: any = await Booking.findOne({ _id: bookingId, customerId }).session(session);
      if (!booking) throw new NotFoundError("Booking not found");
      if (["CANCELLED", "COMPLETED"].includes(booking.status)) throw new BadRequestError("Only active upcoming bookings can be rescheduled");
      const startAt = booking.startAt || normalizeBookingDate(booking.date);
      const hoursUntilStart = (startAt.getTime() - Date.now()) / 3_600_000;
      if (booking.cancellationPolicy && hoursUntilStart < booking.cancellationPolicy.rescheduleNoticeHours) {
        throw new BadRequestError(`This booking requires at least ${booking.cancellationPolicy.rescheduleNoticeHours} hours notice to reschedule online`);
      }
      if (!booking.serviceId) throw new BadRequestError("This legacy booking must be recreated before it can use online rescheduling");
      const quoteInput: BookingQuoteInput = { serviceId: String(booking.serviceId), property: booking.property as any, propertySize: booking.propertySize, frequency: booking.frequency, extraCodes: booking.extras.map((extra: any) => extra.code) };
      const quote = await existingBookingSchedulingQuote(booking);
      const oldDate = normalizeBookingDate(booking.date), oldTimeSlot = booking.timeSlot;
      await releaseCapacity(booking.capacityBucketKeys, booking.requiredStaffSnapshot, session);
      const slot = await evaluateSlot({ input: quoteInput, quote, date, time: timeSlot, session });
      if (!slot.available) throw new ConflictError("The requested replacement time is no longer available");
      await reserveCapacity(slot, quote.scheduling.requiredStaff, session);
      booking.date = normalizeBookingDate(date); booking.timeSlot = timeSlot; booking.startAt = slot.startAt; booking.endAt = slot.endAt;
      booking.blockedStartAt = slot.blockedStartAt; booking.blockedEndAt = slot.blockedEndAt; booking.capacityBucketKeys = slot.capacityBucketKeys;
      booking.durationMinutes = quote.scheduling.durationMinutes; booking.requiredStaffSnapshot = quote.scheduling.requiredStaff;
      await booking.save({ session });
      rescheduledBooking = booking;
      if (oldDate.toISOString().slice(0, 10) !== date || oldTimeSlot !== timeSlot) oldOpening = { date: oldDate, timeSlot: oldTimeSlot };
    });
  } finally { await session.endSession(); }
  if (!rescheduledBooking) throw new NotFoundError("Booking not found");
  if (oldOpening) void notifyWaitlistForOpening({ ...rescheduledBooking.toObject(), date: oldOpening.date, timeSlot: oldOpening.timeSlot });
  try { await ensureJobForBooking(rescheduledBooking); } catch (error) { console.error("Rescheduled booking job sync failed:", error); }
  await queueBookingNotification(rescheduledBooking, "BOOKING_RESCHEDULED", `Booking rescheduled · ${rescheduledBooking.reference}`, `Your booking ${rescheduledBooking.reference} is now scheduled for ${date} at ${labelTime(timeSlot)}.`, `${date}:${timeSlot}`);
  return sanitizeManagedBooking(rescheduledBooking);
};

const startManagedPayment = async (data: ManageLookupInput) => {
  const booking = await managedBooking(data);
  if (booking.payment?.status === "PAID") return { alreadyPaid: true, checkoutUrl: undefined };
  if (!booking.payment?.depositAmount || booking.payment.depositAmount <= 0) {
    throw new BadRequestError("This booking does not require a deposit");
  }
  if (booking.payment?.status === "PENDING" && booking.payment?.checkoutUrl) {
    return { alreadyPaid: false, checkoutUrl: booking.payment.checkoutUrl };
  }

  const claimed = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      "payment.status": { $in: ["UNPAID", "FAILED"] },
    },
    {
      $set: { "payment.status": "PENDING" },
      $unset: { "payment.checkoutUrl": "", "payment.checkoutSessionId": "" },
      $inc: { "payment.attempt": 1 },
    },
    { new: true },
  );

  if (!claimed) {
    const latest = await Booking.findById(booking._id);
    if (latest?.payment?.status === "PAID") return { alreadyPaid: true, checkoutUrl: undefined };
    if (latest?.payment?.status === "PENDING" && latest.payment.checkoutUrl) {
      return { alreadyPaid: false, checkoutUrl: latest.payment.checkoutUrl };
    }
    throw new ConflictError("A secure payment checkout is already being prepared. Please retry in a moment.");
  }

  const occurrences = await getBookingOccurrences(claimed);
  const amount = money(
    occurrences.reduce((sum, occurrence) => sum + Number(occurrence.payment?.depositAmount || 0), 0),
  );
  const attempt = Math.max(1, Number(claimed.payment?.attempt || 1));
  const filter = claimed.recurrenceGroupId
    ? { recurrenceGroupId: claimed.recurrenceGroupId }
    : { _id: claimed._id };

  try {
    const checkout = await createStripeCheckoutSession({
      reference: claimed.reference,
      recurrenceGroupId: claimed.recurrenceGroupId,
      customerEmail: claimed.customerDetails.email,
      amount,
      currency: claimed.payment.currency,
      idempotencyKey: `booking-payment:${claimed.reference}:${attempt}`,
    });
    await Booking.updateMany(filter, {
      $set: {
        "payment.status": "PENDING",
        "payment.checkoutSessionId": checkout.id,
        "payment.checkoutUrl": checkout.url,
      },
    });
    return { alreadyPaid: false, checkoutUrl: checkout.url };
  } catch (error) {
    await Booking.updateMany(filter, {
      $set: { "payment.status": "FAILED" },
      $unset: { "payment.checkoutSessionId": "", "payment.checkoutUrl": "" },
    });
    throw error;
  }
};

const bookingService = {
  createBooking,
  getQuote,
  getAvailability,
  getAllBookings,
  getBookingById,
  getAdminWaitlist,
  getAdminAbandonedBookings,
  updateBookingStatus,
  getBookedSlots,
  joinWaitlist,
  captureAbandonment,
  getManagedBooking,
  cancelManagedBooking,
  rescheduleManagedBooking,
  cancelCustomerBooking,
  rescheduleCustomerBooking,
  startManagedPayment,
};

export default bookingService;

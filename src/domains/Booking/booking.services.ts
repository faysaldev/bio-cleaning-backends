import Booking from "./booking.model";
import BookingCounter from "./bookingCounter.model";
import BookingSlot from "./bookingSlot.model";
import {
  BookingQuoteInput,
  CreateBookingInput,
} from "./booking.validation";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/errors";
import { sendEmail } from "../../lib/mail.service";
import { bookingStatusTemplate } from "../../lib/templates/emailTemplates";
import Service, {
  DEFAULT_FREQUENCY_DISCOUNTS,
  DEFAULT_MINIMUM_PRICE,
  DEFAULT_PROPERTY_SIZE_ADJUSTMENTS,
} from "../Service/service.model";

const ACTIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED", "COMPLETED"];
const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const normalizeBookingDate = (value: string | Date) => {
  const raw = typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  return new Date(`${raw}T00:00:00.000Z`);
};

const buildSlotKey = (date: string | Date, timeSlot: string) =>
  `${normalizeBookingDate(date).toISOString().slice(0, 10)}::${timeSlot.trim().toLowerCase()}`;

const nextBookingReference = async () => {
  const counter = await BookingCounter.findByIdAndUpdate(
    "booking-reference",
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return `BIO-${new Date().getUTCFullYear()}-${String(counter.sequence).padStart(6, "0")}`;
};

const calculateBookingQuote = async (data: BookingQuoteInput) => {
  const service = await Service.findOne({ _id: data.serviceId, isActive: true });
  if (!service) throw new NotFoundError("Selected service is unavailable");

  const pricing = service.pricing;
  const minimumPrice = pricing?.minimumPrice ?? DEFAULT_MINIMUM_PRICE;
  const taxRate = pricing?.taxRate ?? 0;
  const propertyAdjustments =
    pricing?.propertySizeAdjustments?.length
      ? pricing.propertySizeAdjustments
      : DEFAULT_PROPERTY_SIZE_ADJUSTMENTS;
  const frequencyDiscounts =
    pricing?.frequencyDiscounts?.length
      ? pricing.frequencyDiscounts
      : DEFAULT_FREQUENCY_DISCOUNTS;
  const propertyAdjustment =
    propertyAdjustments.find((item) => item.key === data.propertySize)?.amount ?? 0;
  const frequencyDiscountPercent =
    frequencyDiscounts.find((item) => item.frequency === data.frequency)?.percent ?? 0;

  const requestedExtraCodes = [...new Set(data.extraCodes || [])];
  const activeExtras = (pricing?.extras || []).filter((item) => item.isActive);
  const extras = requestedExtraCodes.map((code) => {
    const extra = activeExtras.find((item) => item.code.toUpperCase() === code.toUpperCase());
    if (!extra) throw new BadRequestError(`Invalid or unavailable extra: ${code}`);
    return { code: extra.code, name: extra.name, price: money(extra.price) };
  });

  const basePrice = money(service.basePrice);
  const priceBeforeFrequencyDiscount = money(Math.max(0, basePrice + propertyAdjustment));
  const discountedServicePrice = Math.round(
    priceBeforeFrequencyDiscount * (1 - frequencyDiscountPercent / 100),
  );
  // Preserve the existing website rule: frequency discount applies first, then
  // the configured minimum price is enforced.
  const serviceSubtotal = money(Math.max(minimumPrice, discountedServicePrice));
  const frequencyDiscountAmount = money(
    Math.max(0, priceBeforeFrequencyDiscount - serviceSubtotal),
  );
  const extrasTotal = money(extras.reduce((sum, extra) => sum + extra.price, 0));
  const subtotal = money(serviceSubtotal + extrasTotal);

  let promotionDiscount = 0;
  let appliedPromoCode: string | undefined;
  if (data.promoCode) {
    const now = new Date();
    const promo = (pricing?.promotions || []).find(
      (item) =>
        item.isActive &&
        item.code.toUpperCase() === data.promoCode!.toUpperCase() &&
        (!item.startsAt || item.startsAt <= now) &&
        (!item.endsAt || item.endsAt >= now),
    );
    if (!promo) throw new BadRequestError("Promotion code is invalid or expired");
    appliedPromoCode = promo.code;
    promotionDiscount = money(
      promo.type === "PERCENT"
        ? subtotal * (Math.min(100, promo.value) / 100)
        : Math.min(subtotal, promo.value),
    );
  }

  const taxableSubtotal = money(Math.max(0, subtotal - promotionDiscount));
  const taxAmount = money(taxableSubtotal * (taxRate / 100));
  const total = money(taxableSubtotal + taxAmount);

  return {
    service,
    extras,
    promoCode: appliedPromoCode,
    priceBreakdown: {
      basePrice,
      propertyAdjustment: money(propertyAdjustment),
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

const reserveSlot = async (slotKey: string, bookingId: any) => {
  try {
    await BookingSlot.create({
      _id: slotKey,
      bookingId,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      throw new ConflictError("This time slot was just booked. Please choose another time.");
    }
    throw error;
  }
};

const createBooking = async (data: CreateBookingInput) => {
  const quote = await calculateBookingQuote(data);
  const date = normalizeBookingDate(data.date);
  const slotKey = buildSlotKey(date, data.timeSlot);

  // Protect legacy bookings created before atomic slot reservations existed.
  const existingBooking = await Booking.exists({
    date,
    timeSlot: data.timeSlot,
    status: { $in: ACTIVE_BOOKING_STATUSES },
  });
  if (existingBooking) {
    throw new ConflictError("This time slot is already booked. Please choose another time.");
  }

  const reference = await nextBookingReference();
  const booking = new Booking({
    reference,
    serviceId: quote.service._id,
    serviceType: quote.service.name,
    propertySize: data.propertySize,
    date,
    timeSlot: data.timeSlot,
    slotKey,
    frequency: data.frequency,
    extras: quote.extras,
    promoCode: quote.promoCode,
    customerDetails: data.customerDetails,
    notes: data.notes,
    priceBreakdown: quote.priceBreakdown,
    totalAmount: quote.priceBreakdown.total,
    status: "PENDING",
  });

  await reserveSlot(slotKey, booking._id);
  try {
    await booking.save();
    await BookingSlot.updateOne(
      { _id: slotKey, bookingId: booking._id },
      { $unset: { expiresAt: 1 } },
    );
    return booking;
  } catch (error) {
    await BookingSlot.deleteOne({ _id: slotKey, bookingId: booking._id });
    throw error;
  }
};

const getQuote = async (data: BookingQuoteInput) => {
  const quote = await calculateBookingQuote(data);
  return {
    serviceId: String(quote.service._id),
    serviceName: quote.service.name,
    extras: quote.extras,
    promoCode: quote.promoCode,
    priceBreakdown: quote.priceBreakdown,
    totalAmount: quote.priceBreakdown.total,
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
    Booking.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Booking.countDocuments(filter),
  ]);

  return {
    bookings,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

const getBookingById = async (id: string) => {
  const booking = await Booking.findById(id);
  if (!booking) throw new NotFoundError("Booking not found");
  return booking;
};

const updateBookingStatus = async (id: string, status: any) => {
  const booking = await Booking.findById(id);
  if (!booking) throw new NotFoundError("Booking not found");

  const slotKey = buildSlotKey(booking.date, booking.timeSlot);
  const wasCancelled = booking.status === "CANCELLED";
  const willBeCancelled = status === "CANCELLED";
  let reservedForReactivation = false;

  if (!willBeCancelled) {
    const existingOtherBooking = await Booking.exists({
      _id: { $ne: booking._id },
      date: booking.date,
      timeSlot: booking.timeSlot,
      status: { $in: ACTIVE_BOOKING_STATUSES },
    });
    if (existingOtherBooking) {
      throw new ConflictError("That time slot is already occupied by another active booking.");
    }

    const existingReservation = await BookingSlot.findById(slotKey);
    if (!existingReservation) {
      await reserveSlot(slotKey, booking._id);
      reservedForReactivation = true;
    } else if (String(existingReservation.bookingId) !== String(booking._id)) {
      throw new ConflictError("That time slot is already reserved by another booking.");
    }
  }

  booking.status = status;
  booking.slotKey = willBeCancelled ? undefined : slotKey;

  try {
    await booking.save();
    if (willBeCancelled) {
      await BookingSlot.deleteOne({ _id: slotKey, bookingId: booking._id });
    } else if (reservedForReactivation || wasCancelled) {
      await BookingSlot.updateOne(
        { _id: slotKey, bookingId: booking._id },
        { $unset: { expiresAt: 1 } },
      );
    }
  } catch (error) {
    if (reservedForReactivation) {
      await BookingSlot.deleteOne({ _id: slotKey, bookingId: booking._id });
    }
    throw error;
  }

  try {
    const emailHtml = bookingStatusTemplate({
      name: booking.customerDetails.name,
      status: booking.status as any,
      date: new Date(booking.date).toLocaleDateString(),
      time: booking.timeSlot,
      reference: booking.reference,
    });
    await sendEmail(
      booking.customerDetails.email,
      `Booking Update: ${booking.reference} is now ${booking.status}`,
      `Your booking ${booking.reference} status has been updated to ${booking.status}.`,
      emailHtml,
    );
  } catch (error) {
    console.error("Failed to send booking status email:", error);
  }

  return booking;
};

const getBookedSlots = async (date: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
    throw new BadRequestError("Date must use YYYY-MM-DD format");
  }
  const bookings = await Booking.find({
    date: normalizeBookingDate(date),
    status: { $in: ACTIVE_BOOKING_STATUSES },
  }).select("timeSlot");
  return bookings.map((booking) => booking.timeSlot);
};

const bookingService = {
  createBooking,
  getQuote,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  getBookedSlots,
};

export default bookingService;

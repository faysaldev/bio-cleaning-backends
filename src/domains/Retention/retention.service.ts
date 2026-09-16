import Booking from "../Booking/booking.model";
import Customer from "../Customer/customer.model";
import CustomerNotification from "../Notification/notification.model";
import NotificationDelivery from "../Notification/notificationDelivery.model";
import mongoose from "mongoose";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import RetentionSettings from "./retentionSettings.model";
import ReviewRequest from "../Review/reviewRequest.model";
import reviewService from "../Review/review.service";
import { emitCustomerEvent } from "../Notification/notification.service";

const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);
const monthKey = (date = new Date()) => date.toISOString().slice(0, 7);

const getSettings = async () => RetentionSettings.getSingleton();
const updateSettings = async (data: any) => RetentionSettings.findByIdAndUpdate("default", { $set: data }, { upsert: true, new: true, setDefaultsOnInsert: true });

const queueBookingReminders = async (settings: any) => {
  if (!settings.bookingRemindersEnabled) return 0;
  let queued = 0;
  for (const hours of settings.reminderHoursBefore || []) {
    const target = new Date(Date.now() + Number(hours) * 60 * 60 * 1000);
    const start = new Date(target.getTime() - 10 * 60 * 1000);
    const end = new Date(target.getTime() + 10 * 60 * 1000);
    const bookings: any[] = await Booking.find({
      customerId: { $exists: true },
      status: { $in: ["PENDING", "CONFIRMED"] },
      startAt: { $gte: start, $lte: end },
    }).lean();
    for (const booking of bookings) {
      const dedupeKey = `booking-reminder:${booking._id}:${hours}:${booking.startAt?.toISOString?.() || booking.timeSlot}`;
      const exists = await CustomerNotification.exists({ dedupeKey });
      if (exists) continue;
      await emitCustomerEvent({
        customerId: String(booking.customerId),
        bookingId: String(booking._id),
        type: "BOOKING_REMINDER",
        title: `Cleaning reminder · ${hours}h`,
        message: `Your ${booking.serviceType} visit is coming up at ${booking.timeSlot}. Reference ${booking.reference}.`,
        href: "/portal/bookings",
        email: booking.customerDetails?.email,
        phone: booking.customerDetails?.phone,
        smsText: `BIO Cleaning reminder: ${booking.serviceType} is scheduled in about ${hours} hours. Ref ${booking.reference}.`,
        dedupeKey,
        sendSms: settings.smsEnabled,
      });
      queued += 1;
    }
  }
  return queued;
};

const queueMissedReviewRequests = async (settings: any) => {
  if (!settings.reviewRequestsEnabled) return 0;
  const cutoff = new Date(Date.now() - Number(settings.reviewDelayMinutes || 0) * 60 * 1000);
  const completed: any[] = await Booking.find({
    status: "COMPLETED",
    customerId: { $exists: true },
    updatedAt: { $lte: cutoff },
  }).sort({ updatedAt: -1 }).limit(200).lean();
  let queued = 0;
  for (const booking of completed) {
    if (await ReviewRequest.exists({ bookingId: booking._id })) continue;
    const result = await reviewService.createReviewRequestForBooking(String(booking._id));
    if (result) queued += 1;
  }
  return queued;
};

const queueRebookReminders = async (settings: any) => {
  if (!settings.rebookRemindersEnabled) return 0;
  const cutoff = new Date(Date.now() - Number(settings.rebookReminderDays) * 24 * 60 * 60 * 1000);
  const recentCompleted: any[] = await Booking.aggregate([
    { $match: { customerId: { $exists: true }, status: "COMPLETED", startAt: { $lte: cutoff } } },
    { $sort: { startAt: -1 } },
    { $group: { _id: "$customerId", booking: { $first: "$$ROOT" } } },
    { $limit: 500 },
  ]);
  let queued = 0;
  for (const row of recentCompleted) {
    const customerId = String(row._id);
    const hasUpcoming = await Booking.exists({ customerId: row._id, status: { $in: ["PENDING", "CONFIRMED"] }, startAt: { $gte: new Date() } });
    if (hasUpcoming) continue;
    const customer: any = await Customer.findById(customerId).lean();
    if (!customer || customer.status !== "ACTIVE") continue;
    const dedupeKey = `rebook:${customerId}:${monthKey()}`;
    if (await CustomerNotification.exists({ dedupeKey })) continue;
    await emitCustomerEvent({
      customerId,
      bookingId: String(row.booking._id),
      type: "REBOOK_REMINDER",
      title: "Ready for your next clean?",
      message: `It has been a little while since your last ${row.booking.serviceType} visit. You can book the same service again from your portal.`,
      href: "/portal/bookings",
      email: customer.email,
      phone: customer.phone,
      dedupeKey,
      sendSms: settings.smsEnabled,
    });
    queued += 1;
  }
  return queued;
};

const queueWinBack = async (settings: any) => {
  if (!settings.winBackEnabled) return 0;
  const cutoff = new Date(Date.now() - Number(settings.inactiveCustomerDays) * 24 * 60 * 60 * 1000);
  const customers: any[] = await Customer.find({ status: "ACTIVE", lastActivityAt: { $lte: cutoff } }).limit(500).lean();
  let queued = 0;
  for (const customer of customers) {
    const hasUpcoming = await Booking.exists({ customerId: customer._id, status: { $in: ["PENDING", "CONFIRMED"] }, startAt: { $gte: new Date() } });
    if (hasUpcoming) continue;
    const dedupeKey = `win-back:${customer._id}:${monthKey()}`;
    if (await CustomerNotification.exists({ dedupeKey })) continue;
    await emitCustomerEvent({
      customerId: String(customer._id),
      type: "WIN_BACK",
      title: "We would love to clean for you again",
      message: "Need a fresh reset? Your customer portal makes it quick to book another BIO Cleaning visit.",
      href: "/portal",
      email: customer.email,
      phone: customer.phone,
      dedupeKey,
      sendSms: settings.smsEnabled,
    });
    queued += 1;
  }
  return queued;
};

const runAutomationSweep = async () => {
  const settings = await getSettings();
  const [reminders, reviews, rebook, winBack] = await Promise.all([
    queueBookingReminders(settings),
    queueMissedReviewRequests(settings),
    queueRebookReminders(settings),
    queueWinBack(settings),
  ]);
  return { reminders, reviews, rebook, winBack, ranAt: new Date(), day: dayKey() };
};

const getSummary = async () => {
  const [settings, notificationCount, unreadCount, queued, failed, sent, reviewsPending, reviewsSubmitted] = await Promise.all([
    getSettings(),
    CustomerNotification.countDocuments(),
    CustomerNotification.countDocuments({ readAt: { $exists: false } }),
    NotificationDelivery.countDocuments({ status: { $in: ["QUEUED", "PROCESSING"] } }),
    NotificationDelivery.countDocuments({ status: "FAILED" }),
    NotificationDelivery.countDocuments({ status: "SENT" }),
    ReviewRequest.countDocuments({ status: "PENDING" }),
    ReviewRequest.countDocuments({ status: "SUBMITTED" }),
  ]);
  return { settings, notificationCount, unreadCount, queue: { queued, failed, sent }, reviews: { pending: reviewsPending, submitted: reviewsSubmitted } };
};

const listDeliveries = async (query: any = {}) => {
  const page = Math.max(1, Number(query.page) || 1), limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
  const filter: any = {};
  if (query.status) filter.status = query.status;
  if (query.channel) filter.channel = query.channel;
  const [items, total] = await Promise.all([
    NotificationDelivery.find(filter).select("channel recipient subject status provider attempts nextAttemptAt sentAt lastError createdAt updatedAt").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    NotificationDelivery.countDocuments(filter),
  ]);
  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

const retryDelivery = async (id: string) => {
  if (!mongoose.isValidObjectId(id)) throw new BadRequestError("Invalid delivery id");
  const delivery: any = await NotificationDelivery.findById(id);
  if (!delivery) throw new NotFoundError("Delivery not found");
  if (delivery.status !== "FAILED") throw new BadRequestError("Only failed deliveries can be retried");
  delivery.status = "QUEUED";
  delivery.attempts = 0;
  delivery.nextAttemptAt = new Date();
  delivery.lockedAt = undefined;
  delivery.lastError = undefined;
  await delivery.save();
  return delivery;
};

export default { getSettings, updateSettings, runAutomationSweep, getSummary, listDeliveries, retryDelivery };

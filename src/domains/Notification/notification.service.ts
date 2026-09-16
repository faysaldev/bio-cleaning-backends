import CustomerNotification, { NotificationType } from "./notification.model";
import NotificationDelivery, { NotificationChannel } from "./notificationDelivery.model";
import Customer from "../Customer/customer.model";
import { FRONTEND_URL } from "../../config/ENV";
import RetentionSettings from "../Retention/retentionSettings.model";
import { getRedis } from "../../config/redis";

export const portalUrl = (path = "") => {
  if (!FRONTEND_URL) return undefined;
  return `${FRONTEND_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
};

type QueueDeliveryInput = {
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  text: string;
  html?: string;
  notificationId?: string;
  dedupeKey?: string;
};

export const enqueueDelivery = async (input: QueueDeliveryInput) => {
  if (!input.recipient?.trim()) return null;
  try {
    const delivery = await NotificationDelivery.create({
      notificationId: input.notificationId,
      channel: input.channel,
      recipient: input.recipient.trim(),
      subject: input.subject,
      text: input.text,
      html: input.html,
      dedupeKey: input.dedupeKey,
      status: "QUEUED",
      nextAttemptAt: new Date(),
    });
    const redis = await getRedis();
    if (redis) void redis.multi().lpush("queue:notifications", String(delivery._id)).ltrim("queue:notifications", 0, 9999).exec().catch(() => undefined);
    return delivery;
  } catch (error: any) {
    if (error?.code === 11000 && input.dedupeKey) {
      return NotificationDelivery.findOne({ dedupeKey: input.dedupeKey });
    }
    throw error;
  }
};

type CustomerEventInput = {
  customerId?: string;
  bookingId?: string;
  invoiceId?: string;
  type: NotificationType;
  title: string;
  message: string;
  href?: string;
  email?: string;
  phone?: string;
  emailSubject?: string;
  emailHtml?: string;
  smsText?: string;
  dedupeKey?: string;
  metadata?: Record<string, unknown>;
  sendEmail?: boolean;
  sendSms?: boolean;
};

export const emitCustomerEvent = async (input: CustomerEventInput) => {
  let customer: any = null;
  if (input.customerId) customer = await Customer.findById(input.customerId).select("email phone preferences").lean();
  const email = input.email || customer?.email;
  const phone = input.phone || customer?.phone;
  let notification: any;
  try {
    notification = await CustomerNotification.create({
      customerId: input.customerId,
      bookingId: input.bookingId,
      invoiceId: input.invoiceId,
      type: input.type,
      title: input.title,
      message: input.message,
      href: input.href,
      dedupeKey: input.dedupeKey,
      metadata: input.metadata,
    });
  } catch (error: any) {
    if (error?.code === 11000 && input.dedupeKey) {
      notification = await CustomerNotification.findOne({ dedupeKey: input.dedupeKey });
    } else throw error;
  }
  if (!notification) return null;

  const wantsSms = input.sendSms === true || customer?.preferences?.contactMethod === "SMS";
  const smsAllowed = wantsSms ? Boolean((await RetentionSettings.getSingleton()).smsEnabled) : false;
  const wantsEmail = input.sendEmail !== false;
  const destination = input.href ? portalUrl(input.href) : undefined;
  const emailText = `${input.message}${destination ? `\n\nOpen: ${destination}` : ""}`;
  const smsText = input.smsText || `${input.message}${destination ? ` ${destination}` : ""}`;
  const jobs: Promise<unknown>[] = [];
  if (wantsEmail && email) {
    jobs.push(enqueueDelivery({
      channel: "EMAIL",
      recipient: email,
      subject: input.emailSubject || input.title,
      text: emailText,
      html: input.emailHtml,
      notificationId: String(notification._id),
      dedupeKey: input.dedupeKey ? `${input.dedupeKey}:email` : undefined,
    }));
  }
  if (smsAllowed && phone) {
    jobs.push(enqueueDelivery({
      channel: "SMS",
      recipient: phone,
      text: smsText,
      notificationId: String(notification._id),
      dedupeKey: input.dedupeKey ? `${input.dedupeKey}:sms` : undefined,
    }));
  }
  await Promise.allSettled(jobs);
  return notification;
};

export const listCustomerNotifications = async (customerId: string, query: any = {}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const filter: any = { customerId };
  if (query.unread === "true" || query.unread === true) filter.readAt = { $exists: false };
  const [items, total, unread] = await Promise.all([
    CustomerNotification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    CustomerNotification.countDocuments(filter),
    CustomerNotification.countDocuments({ customerId, readAt: { $exists: false } }),
  ]);
  return { items, unread, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const markRead = async (customerId: string, id: string) =>
  CustomerNotification.findOneAndUpdate({ _id: id, customerId }, { $set: { readAt: new Date() } }, { new: true });

export const markAllRead = async (customerId: string) => {
  await CustomerNotification.updateMany({ customerId, readAt: { $exists: false } }, { $set: { readAt: new Date() } });
};

export default { enqueueDelivery, emitCustomerEvent, listCustomerNotifications, markRead, markAllRead };

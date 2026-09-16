import crypto from "crypto";
import Booking from "../Booking/booking.model";
import Invoice from "../Invoice/invoice.model";
import PaymentTransaction from "../Payment/paymentTransaction.model";
import Customer from "../Customer/customer.model";
import CustomerNotification from "../Notification/notification.model";
import customerService from "../Customer/customer.services";
import bookingService from "../Booking/booking.services";
import PortalMagicLink from "./portalMagicLink.model";
import PortalSession from "./portalSession.model";
import { generateCsrfToken, hashToken } from "../../lib/authTokens";
import { FRONTEND_URL, PORTAL_MAGIC_LINK_MINUTES, PORTAL_SESSION_DAYS } from "../../config/ENV";
import { enqueueDelivery } from "../Notification/notification.service";
import { NotFoundError, UnauthorizedError } from "../../lib/errors";
import { createInvoiceCheckoutSession } from "../Payment/stripe.service";
import { refreshInvoiceFinancials } from "../Invoice/invoiceAccounting";

const cleanCustomer = (customer: any) => ({
  id: String(customer._id),
  name: customer.name,
  email: customer.email,
  phone: customer.phone,
  addresses: customer.addresses || [],
  preferences: customer.preferences || {},
  accessInstructions: customer.accessInstructions,
  pets: customer.pets || [],
});

const requestMagicLink = async (email: string, context: { ipAddress?: string }) => {
  const normalized = email.trim().toLowerCase();
  const customer: any = await Customer.findOne({ normalizedEmail: normalized, status: "ACTIVE" });
  if (!customer || !FRONTEND_URL) return;

  await PortalMagicLink.deleteMany({ customerId: customer._id, consumedAt: { $exists: false } });
  const rawToken = crypto.randomBytes(32).toString("hex");
  await PortalMagicLink.create({
    customerId: customer._id,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + PORTAL_MAGIC_LINK_MINUTES * 60 * 1000),
    requestedIp: context.ipAddress,
  });
  const url = `${FRONTEND_URL.replace(/\/$/, "")}/portal/auth?token=${encodeURIComponent(rawToken)}`;
  await enqueueDelivery({
    channel: "EMAIL",
    recipient: normalized,
    subject: "Your secure BIO Cleaning customer portal link",
    text: `Use this secure one-time link to access your BIO Cleaning portal. It expires in ${PORTAL_MAGIC_LINK_MINUTES} minutes: ${url}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#123b2a"><h2>Your customer portal</h2><p>Hi ${customer.name},</p><p>Use the secure button below to view appointments, invoices, receipts and preferences.</p><p><a href="${url}" style="display:inline-block;padding:12px 18px;background:#123b2a;color:white;text-decoration:none;border-radius:10px">Open customer portal</a></p><p>This link expires in ${PORTAL_MAGIC_LINK_MINUTES} minutes and can be used once.</p></div>`,
  });
};

const exchangeMagicLink = async (rawToken: string, context: { ipAddress?: string; userAgent?: string }) => {
  const magic: any = await PortalMagicLink.findOneAndUpdate(
    { tokenHash: hashToken(rawToken), consumedAt: { $exists: false }, expiresAt: { $gt: new Date() } },
    { $set: { consumedAt: new Date() } },
    { new: true },
  ).select("+tokenHash");
  if (!magic) throw new UnauthorizedError("This portal link is invalid, expired, or has already been used");
  const customer: any = await Customer.findOne({ _id: magic.customerId, status: "ACTIVE" });
  if (!customer) throw new UnauthorizedError("Customer account is no longer active");

  const rawSession = crypto.randomBytes(32).toString("hex");
  const csrfToken = generateCsrfToken();
  await PortalSession.create({
    customerId: customer._id,
    tokenHash: hashToken(rawSession),
    csrfToken,
    expiresAt: new Date(Date.now() + PORTAL_SESSION_DAYS * 24 * 60 * 60 * 1000),
    lastSeenAt: new Date(),
    ipAddress: context.ipAddress,
    userAgent: context.userAgent?.slice(0, 500),
  });
  return { rawSession, csrfToken, customer: cleanCustomer(customer), maxAgeSeconds: PORTAL_SESSION_DAYS * 24 * 60 * 60 };
};

const getSession = async (sessionId: string, customerId: string) => {
  const [session, customer] = await Promise.all([
    PortalSession.findById(sessionId).select("+csrfToken"),
    Customer.findById(customerId),
  ]);
  if (!session || !customer) throw new UnauthorizedError("Portal session is no longer active");
  return { csrfToken: (session as any).csrfToken, customer: cleanCustomer(customer) };
};

const revokeSession = async (sessionId: string) => { await PortalSession.deleteOne({ _id: sessionId }); };

const listBookings = async (customerId: string, query: any = {}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const filter: any = { customerId };
  if (query.status) filter.status = query.status;
  if (query.scope === "upcoming") filter.startAt = { $gte: new Date() }, filter.status = { $in: ["PENDING", "CONFIRMED"] };
  const [items, total] = await Promise.all([
    Booking.find(filter).sort({ startAt: query.scope === "upcoming" ? 1 : -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Booking.countDocuments(filter),
  ]);
  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

const getBooking = async (customerId: string, bookingId: string) => {
  const booking = await Booking.findOne({ _id: bookingId, customerId }).lean();
  if (!booking) throw new NotFoundError("Booking not found");
  return booking;
};

const getOverview = async (customerId: string) => {
  const now = new Date();
  const [customer, upcoming, recent, invoices, payments, unread] = await Promise.all([
    Customer.findById(customerId).lean(),
    Booking.find({ customerId, status: { $in: ["PENDING", "CONFIRMED"] }, startAt: { $gte: now } }).sort({ startAt: 1 }).limit(5).lean(),
    Booking.find({ customerId }).sort({ startAt: -1, createdAt: -1 }).limit(5).lean(),
    Invoice.find({ customerId }).sort({ issuedAt: -1 }).limit(5).lean(),
    PaymentTransaction.find({ customerId, status: "SUCCEEDED" }).sort({ processedAt: -1, createdAt: -1 }).limit(5).lean(),
    CustomerNotification.countDocuments({ customerId, readAt: { $exists: false } }),
  ]);
  if (!customer) throw new NotFoundError("Customer not found");
  return { customer: cleanCustomer(customer), upcoming, recent, invoices, payments, unreadNotifications: unread };
};

const listInvoices = async (customerId: string) => Invoice.find({ customerId }).sort({ issuedAt: -1 }).lean();
const listPayments = async (customerId: string) => PaymentTransaction.find({ customerId }).sort({ processedAt: -1, createdAt: -1 }).lean();
const payInvoice = async (customerId: string, invoiceId: string) => {
  const owned: any = await Invoice.findOne({ _id: invoiceId, customerId });
  if (!owned) throw new NotFoundError("Invoice not found");
  const invoice: any = await refreshInvoiceFinancials(invoiceId);
  return createInvoiceCheckoutSession(invoice, `portal-invoice:${invoice._id}:${invoice.amountDue}`, "/portal/invoices");
};


const updateProfile = async (customerId: string, data: any) => {
  const updated: any = await customerService.updateCustomer(customerId, data);
  return cleanCustomer(updated);
};

const cancelBooking = async (customerId: string, bookingId: string, reason?: string) =>
  bookingService.cancelCustomerBooking(customerId, bookingId, reason);

const rescheduleBooking = async (customerId: string, bookingId: string, date: string, timeSlot: string) =>
  bookingService.rescheduleCustomerBooking(customerId, bookingId, date, timeSlot);

const rebookDraft = async (customerId: string, bookingId: string) => {
  const booking: any = await Booking.findOne({ _id: bookingId, customerId }).lean();
  if (!booking) throw new NotFoundError("Booking not found");
  return {
    serviceId: booking.serviceId ? String(booking.serviceId) : undefined,
    property: booking.property,
    extraCodes: (booking.extras || []).map((item: any) => item.code),
    frequency: booking.frequency,
    customerDetails: booking.customerDetails,
    notes: booking.notes,
  };
};

export default { requestMagicLink, exchangeMagicLink, getSession, revokeSession, getOverview, listBookings, getBooking, listInvoices, listPayments, payInvoice, updateProfile, cancelBooking, rescheduleBooking, rebookDraft };

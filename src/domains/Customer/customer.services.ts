import { Types } from "mongoose";
import Customer from "./customer.model";
import Booking from "../Booking/booking.model";
import Lead from "../Lead/lead.model";
import LeadTask from "../Lead/leadTask.model";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/errors";
import type { CreateCustomerInput, UpdateCustomerInput } from "./customer.validation";

export const normalizeEmail = (value?: string | null) => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized || undefined;
};

export const normalizePhone = (value?: string | null) => {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  const leadingPlus = raw.startsWith("+") ? "+" : "";
  const digits = raw.replace(/\D/g, "");
  return digits ? `${leadingPlus}${digits}` : undefined;
};

const normalizeTags = (tags?: string[]) =>
  [...new Set((tags || []).map((tag) => tag.trim()).filter(Boolean).map((tag) => tag.slice(0, 80)))];

const addressKey = (address: any) =>
  [address?.line1, address?.line2, address?.city, address?.state, address?.zip]
    .map((part) => String(part || "").trim().toLowerCase())
    .join("|");

const dedupeAddresses = (addresses: any[]) => {
  const seen = new Set<string>();
  let primaryAssigned = false;
  const cleaned = addresses.filter((address) => {
    if (!address?.line1 || !address?.city || !address?.zip) return false;
    const key = addressKey(address);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return cleaned.map((address, index) => {
    const requestedPrimary = Boolean(address.isPrimary);
    const isPrimary = !primaryAssigned && (requestedPrimary || (index === 0 && !cleaned.some((item) => item.isPrimary)));
    if (isPrimary) primaryAssigned = true;
    return { ...address, isPrimary };
  });
};

const identityFilter = (email?: string, phone?: string) => {
  const conditions: any[] = [];
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  if (normalizedEmail) conditions.push({ normalizedEmail });
  if (normalizedPhone) conditions.push({ normalizedPhone });
  return conditions.length ? { $or: conditions } : null;
};

const createCustomer = async (data: CreateCustomerInput) => {
  const normalizedEmail = normalizeEmail(data.email);
  const normalizedPhone = normalizePhone(data.phone);
  const filter = identityFilter(normalizedEmail, normalizedPhone);
  if (filter && (await Customer.exists(filter))) {
    throw new ConflictError("A customer with this email or phone already exists");
  }
  return Customer.create({
    ...data,
    email: normalizedEmail,
    normalizedEmail,
    phone: data.phone?.trim() || undefined,
    normalizedPhone,
    tags: normalizeTags(data.tags),
    addresses: dedupeAddresses(data.addresses || []),
    lastActivityAt: new Date(),
  });
};

const upsertCustomer = async ({
  name,
  email,
  phone,
  address,
  source,
  leadId,
  activityAt,
}: {
  name: string;
  email?: string;
  phone?: string;
  address?: any;
  source?: string;
  leadId?: string | Types.ObjectId;
  activityAt?: Date;
}) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  const filter = identityFilter(normalizedEmail, normalizedPhone);
  let customer = filter ? await Customer.findOne(filter) : null;

  if (!customer) {
    try {
      customer = await Customer.create({
        name: name.trim(),
        email: normalizedEmail,
        normalizedEmail,
        phone: phone?.trim() || undefined,
        normalizedPhone,
        addresses: address ? [{ ...address, isPrimary: true }] : [],
        firstLeadId: leadId,
        lastLeadId: leadId,
        createdSource: source,
        lastActivityAt: activityAt || new Date(),
      });
      return customer;
    } catch (error: any) {
      if (error?.code !== 11000 || !filter) throw error;
      customer = await Customer.findOne(filter);
    }
  }

  if (!customer) throw new ConflictError("Customer identity could not be resolved");
  customer.name = name.trim() || customer.name;
  if (!customer.email && normalizedEmail) {
    customer.email = normalizedEmail;
    customer.normalizedEmail = normalizedEmail;
  }
  if (!customer.phone && phone?.trim()) {
    customer.phone = phone.trim();
    customer.normalizedPhone = normalizedPhone;
  }
  if (leadId) {
    customer.firstLeadId = customer.firstLeadId || (leadId as any);
    customer.lastLeadId = leadId as any;
  }
  const activityTime = activityAt || new Date();
  if (!customer.lastActivityAt || activityTime.getTime() > customer.lastActivityAt.getTime()) {
    customer.lastActivityAt = activityTime;
  }
  if (address) {
    const current = customer.addresses.map((item) => item.toObject?.() || item);
    const key = addressKey(address);
    if (!current.some((item) => addressKey(item) === key)) {
      customer.addresses.push({ ...address, isPrimary: current.length === 0 } as any);
    }
  }
  await customer.save();
  return customer;
};

const updateCustomer = async (id: string, data: UpdateCustomerInput) => {
  const customer = await Customer.findById(id);
  if (!customer) throw new NotFoundError("Customer not found");

  if (data.email !== undefined) {
    const normalizedEmail = normalizeEmail(data.email);
    if (normalizedEmail && normalizedEmail !== customer.normalizedEmail) {
      const duplicate = await Customer.exists({ _id: { $ne: customer._id }, normalizedEmail });
      if (duplicate) throw new ConflictError("Another customer already uses this email");
    }
    customer.email = normalizedEmail;
    customer.normalizedEmail = normalizedEmail;
  }
  if (data.phone !== undefined) {
    const normalizedPhone = normalizePhone(data.phone);
    if (normalizedPhone && normalizedPhone !== customer.normalizedPhone) {
      const duplicate = await Customer.exists({ _id: { $ne: customer._id }, normalizedPhone });
      if (duplicate) throw new ConflictError("Another customer already uses this phone number");
    }
    customer.phone = data.phone?.trim() || undefined;
    customer.normalizedPhone = normalizedPhone;
  }
  if (data.name !== undefined) customer.name = data.name.trim();
  if (data.status !== undefined) customer.status = data.status;
  if (data.addresses !== undefined) customer.addresses = dedupeAddresses(data.addresses) as any;
  if (data.preferences !== undefined) customer.preferences = { ...customer.preferences?.toObject?.(), ...data.preferences } as any;
  if (data.accessInstructions !== undefined) customer.accessInstructions = data.accessInstructions;
  if (data.pets !== undefined) customer.pets = data.pets as any;
  if (data.tags !== undefined) customer.tags = normalizeTags(data.tags);
  if (!customer.normalizedEmail && !customer.normalizedPhone) {
    throw new BadRequestError("Customer email or phone is required");
  }
  customer.lastActivityAt = new Date();
  await customer.save();
  return customer;
};

const getCustomers = async (query: any) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const filter: any = {};
  if (query.status) filter.status = query.status;
  if (query.tag) filter.tags = String(query.tag);
  if (query.search) {
    const escaped = String(query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: { $regex: escaped, $options: "i" } },
      { email: { $regex: escaped, $options: "i" } },
      { phone: { $regex: escaped, $options: "i" } },
      { tags: { $regex: escaped, $options: "i" } },
    ];
  }
  const skip = (page - 1) * limit;
  const [customers, total] = await Promise.all([
    Customer.find(filter).sort({ lastActivityAt: -1, updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Customer.countDocuments(filter),
  ]);

  const customerIds = customers.map((customer: any) => customer._id);
  const emails = customers.map((customer: any) => customer.normalizedEmail).filter(Boolean);
  const phones = customers.map((customer: any) => customer.phone).filter(Boolean);
  const bookingMatch = customerIds.length || emails.length || phones.length
    ? {
        $or: [
          ...(customerIds.length ? [{ customerId: { $in: customerIds } }] : []),
          ...(emails.length ? [{ "customerDetails.email": { $in: emails } }] : []),
          ...(phones.length ? [{ "customerDetails.phone": { $in: phones } }] : []),
        ],
      }
    : null;

  const bookingIdentityKey = {
    $cond: [
      { $ne: [{ $ifNull: ["$customerId", null] }, null] },
      { $concat: ["id:", { $toString: "$customerId" }] },
      {
        $cond: [
          { $gt: [{ $strLenCP: { $ifNull: ["$customerDetails.email", ""] } }, 0] },
          { $concat: ["email:", { $toLower: "$customerDetails.email" }] },
          { $concat: ["phone:", { $ifNull: ["$customerDetails.phone", ""] }] },
        ],
      },
    ],
  };

  const [bookingSummary, upcomingSummary] = bookingMatch
    ? await Promise.all([
        Booking.aggregate([
          { $match: bookingMatch },
          {
            $group: {
              _id: bookingIdentityKey,
              bookings: { $sum: 1 },
              completed: { $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] } },
              lifetimeValue: { $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, "$totalAmount", 0] } },
            },
          },
        ]),
        Booking.aggregate([
          {
            $match: {
              ...bookingMatch,
              status: { $in: ["PENDING", "CONFIRMED"] },
              startAt: { $gte: new Date() },
            },
          },
          { $group: { _id: bookingIdentityKey, nextBookingAt: { $min: "$startAt" } } },
        ]),
      ])
    : [[], []];

  const summaryByKey = new Map<string, any>(bookingSummary.map((item: any) => [String(item._id), item]));
  const upcomingByKey = new Map<string, Date>(upcomingSummary.map((item: any) => [String(item._id), item.nextBookingAt]));
  const data = customers.map((customer: any) => {
    const keys = [
      `id:${String(customer._id)}`,
      customer.normalizedEmail ? `email:${String(customer.normalizedEmail).toLowerCase()}` : null,
      customer.phone ? `phone:${String(customer.phone)}` : null,
    ].filter(Boolean) as string[];
    const summary: any = keys.map((key) => summaryByKey.get(key)).find(Boolean) || { bookings: 0, completed: 0, lifetimeValue: 0 };
    const nextBookingAt = keys.map((key) => upcomingByKey.get(key)).find(Boolean) || null;
    return { ...(customer as any), summary: { ...summary, nextBookingAt } };
  });
  return { customers: data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
};

const getCustomer360 = async (id: string) => {
  const customer = await Customer.findById(id).lean();
  if (!customer) throw new NotFoundError("Customer not found");

  const identityOr: any[] = [{ customerId: customer._id }];
  if (customer.normalizedEmail) identityOr.push({ "customerDetails.email": customer.normalizedEmail });
  if (customer.phone) identityOr.push({ "customerDetails.phone": customer.phone });
  const [bookings, leads, tasks] = await Promise.all([
    Booking.find({ $or: identityOr }).sort({ startAt: -1, createdAt: -1 }).lean(),
    Lead.find({ customerId: customer._id }).populate("ownerId", "name email").sort({ createdAt: -1 }).lean(),
    LeadTask.find({ leadId: { $in: await Lead.find({ customerId: customer._id }).distinct("_id") }, status: "PENDING" })
      .sort({ dueAt: 1 })
      .limit(20)
      .lean(),
  ]);

  const now = Date.now();
  const upcomingWork = bookings.filter((booking: any) =>
    ["PENDING", "CONFIRMED"].includes(booking.status) && new Date(booking.startAt || booking.date).getTime() >= now,
  );
  const completed = bookings.filter((booking: any) => booking.status === "COMPLETED");
  const lifetimeValue = completed.reduce((sum: number, booking: any) => sum + Number(booking.totalAmount || 0), 0);
  const outstandingBalance = bookings.reduce((sum: number, booking: any) => {
    if (booking.payment?.option !== "DEPOSIT") return sum;
    if (["PAID", "REFUNDED", "NOT_REQUIRED"].includes(booking.payment?.status)) return sum;
    return sum + Number(booking.payment?.depositAmount || 0);
  }, 0);
  const invoices = bookings
    .filter((booking: any) => booking.status === "COMPLETED" || booking.payment?.option === "DEPOSIT")
    .map((booking: any) => ({
      id: `booking-${booking._id}`,
      reference: booking.reference,
      source: "BOOKING_LEDGER",
      amount: Number(booking.totalAmount || 0),
      depositAmount: Number(booking.payment?.depositAmount || 0),
      paymentStatus: booking.payment?.status || "NOT_REQUIRED",
      service: booking.serviceType,
      date: booking.startAt || booking.date,
    }));

  return {
    customer,
    bookings,
    upcomingWork,
    invoices,
    outstandingBalance,
    lifetimeValue,
    completedBookings: completed.length,
    leads,
    openTasks: tasks,
    reviews: customer.reviews || [],
  };
};

const addNote = async (id: string, body: string, createdBy?: string) => {
  const customer = await Customer.findByIdAndUpdate(
    id,
    {
      $push: { notes: { body, createdBy, createdAt: new Date() } },
      $set: { lastActivityAt: new Date() },
    },
    { new: true },
  );
  if (!customer) throw new NotFoundError("Customer not found");
  return customer;
};

const addReview = async (id: string, review: any) => {
  const customer = await Customer.findByIdAndUpdate(
    id,
    { $push: { reviews: { ...review, createdAt: new Date() } }, $set: { lastActivityAt: new Date() } },
    { new: true },
  );
  if (!customer) throw new NotFoundError("Customer not found");
  return customer;
};

export default {
  createCustomer,
  upsertCustomer,
  updateCustomer,
  getCustomers,
  getCustomer360,
  addNote,
  addReview,
};

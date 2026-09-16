import { Types } from "mongoose";
import Lead, { LEAD_SOURCES, LEAD_STATUSES, LeadSource, LeadStatus } from "./lead.model";
import LeadActivity, { LeadActivityType } from "./leadActivity.model";
import LeadTask from "./leadTask.model";
import Customer from "../Customer/customer.model";
import customerService, { normalizeEmail, normalizePhone } from "../Customer/customer.services";
import User from "../Admin-Auth/user.model";
import Service from "../Service/service.model";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import type {
  CreateLeadActivityInput,
  CreateLeadInput,
  CreateLeadTaskInput,
  PublicCaptureLeadInput,
  UpdateLeadInput,
  UpdateLeadTaskInput,
} from "./lead.validation";
import { getSchedulingSettings } from "../Scheduling/scheduling.services";
import { formatDateInZone, zonedDateTimeToUtc } from "../Scheduling/scheduling.time";

const OPEN_STATUSES: LeadStatus[] = ["NEW", "ATTEMPTED_CONTACT", "CONTACTED", "ESTIMATE_QUOTE_SENT", "FOLLOW_UP"];

const normalizeTags = (tags?: string[]) =>
  [...new Set((tags || []).map((tag) => tag.trim()).filter(Boolean).map((tag) => tag.slice(0, 80)))];

const sourceLabel = (source: LeadSource) =>
  source
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

const resolveTaskDueAt = async (data: { dueAt?: string; dueLocal?: string }) => {
  if (data.dueLocal) {
    const settings = await getSchedulingSettings();
    const [date, time] = data.dueLocal.split("T");
    return zonedDateTimeToUtc(date, time, settings.timezone);
  }
  if (data.dueAt) return new Date(data.dueAt);
  throw new BadRequestError("Follow-up due time is required");
};

const activity = async ({
  leadId,
  type,
  title,
  body,
  direction = "INTERNAL",
  createdBy,
  metadata,
  occurredAt,
}: {
  leadId: string | Types.ObjectId;
  type: LeadActivityType;
  title: string;
  body?: string;
  direction?: "INBOUND" | "OUTBOUND" | "INTERNAL";
  createdBy?: string | Types.ObjectId;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
}) => {
  const entry = await LeadActivity.create({
    leadId,
    type,
    title,
    body,
    direction,
    createdBy: createdBy || undefined,
    metadata,
    occurredAt: occurredAt || new Date(),
  });
  const set: any = { lastActivityAt: entry.occurredAt };
  if (["CALL", "EMAIL", "SMS"].includes(type)) set.lastContactAt = entry.occurredAt;
  await Lead.updateOne({ _id: leadId }, { $set: set });
  return entry;
};

const refreshNextFollowUp = async (leadId: string | Types.ObjectId) => {
  const next = await LeadTask.findOne({ leadId, status: "PENDING" }).sort({ dueAt: 1 }).select("dueAt").lean();
  await Lead.updateOne({ _id: leadId }, { $set: { nextFollowUpAt: next?.dueAt || null } });
  return next?.dueAt;
};

const resolveServiceName = async (serviceId?: string, fallback?: string) => {
  if (!serviceId) return fallback;
  const service = await Service.findById(serviceId).select("name").lean();
  return service?.name || fallback;
};

const assertAdminUser = async (userId?: string | Types.ObjectId | null, label = "Owner") => {
  if (!userId) return;
  const exists = await User.exists({ _id: userId, role: "admin", isDeleted: false });
  if (!exists) throw new BadRequestError(`${label} must be an active admin user`);
};

const findOpenLeadByIdentity = async (email?: string, phone?: string) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  const identity: any[] = [];
  if (normalizedEmail) identity.push({ normalizedEmail });
  if (normalizedPhone) identity.push({ normalizedPhone });
  if (!identity.length) return null;
  return Lead.findOne({ status: { $in: OPEN_STATUSES }, $or: identity }).sort({ updatedAt: -1 });
};

export const upsertLeadFromSource = async ({
  name,
  email,
  phone,
  source,
  referenceId,
  requestedServiceId,
  requestedServiceName,
  value = 0,
  message,
  notes,
  tags,
  ownerId,
  contactId,
  abandonedBookingId,
  referral,
  capturedAt,
}: {
  name: string;
  email?: string;
  phone?: string;
  source: LeadSource;
  referenceId?: string;
  requestedServiceId?: string;
  requestedServiceName?: string;
  value?: number;
  message?: string;
  notes?: string;
  tags?: string[];
  ownerId?: string;
  contactId?: string;
  abandonedBookingId?: string;
  referral?: { referredBy?: string; details?: string };
  capturedAt?: Date;
}) => {
  await assertAdminUser(ownerId, "Lead owner");
  const eventAt = capturedAt || new Date();
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  let lead: any = null;

  if (abandonedBookingId) lead = await Lead.findOne({ abandonedBookingId, status: { $in: OPEN_STATUSES } });
  if (!lead) lead = await findOpenLeadByIdentity(normalizedEmail, phone);

  const resolvedServiceName = await resolveServiceName(requestedServiceId, requestedServiceName);
  if (!lead) {
    lead = await Lead.create({
      name: name.trim() || "Unnamed lead",
      email: normalizedEmail,
      normalizedEmail,
      phone: phone?.trim() || undefined,
      normalizedPhone,
      source,
      sourceHistory: [{ source, referenceId, capturedAt: eventAt }],
      status: "NEW",
      ownerId: ownerId || undefined,
      value: Math.max(0, value || 0),
      requestedServiceId: requestedServiceId || undefined,
      requestedServiceName: resolvedServiceName,
      message,
      notes,
      tags: normalizeTags(tags),
      contactId: contactId || undefined,
      abandonedBookingId: abandonedBookingId || undefined,
      referral,
      lastActivityAt: eventAt,
    });
    await activity({
      leadId: lead._id,
      type: "SYSTEM",
      title: `Lead captured from ${sourceLabel(source)}`,
      body: message,
      metadata: { source, referenceId },
      occurredAt: eventAt,
    });
    return lead;
  }

  const historyExists = lead.sourceHistory?.some(
    (item: any) => item.source === source && (!referenceId || item.referenceId === referenceId),
  );
  if (!historyExists) lead.sourceHistory.push({ source, referenceId, capturedAt: eventAt });
  if (!lead.email && normalizedEmail) {
    lead.email = normalizedEmail;
    lead.normalizedEmail = normalizedEmail;
  }
  if (!lead.phone && phone?.trim()) {
    lead.phone = phone.trim();
    lead.normalizedPhone = normalizedPhone;
  }
  if (name?.trim() && (!lead.name || lead.name === "Unnamed lead")) lead.name = name.trim();
  if (requestedServiceId && !lead.requestedServiceId) lead.requestedServiceId = requestedServiceId;
  if (resolvedServiceName && !lead.requestedServiceName) lead.requestedServiceName = resolvedServiceName;
  if (message && message !== lead.message) lead.message = lead.message ? `${lead.message}\n\n${message}`.slice(0, 5000) : message;
  if (notes && !lead.notes) lead.notes = notes;
  if (value > Number(lead.value || 0)) lead.value = value;
  if (ownerId && !lead.ownerId) lead.ownerId = ownerId;
  if (contactId) lead.contactId = contactId;
  if (abandonedBookingId) lead.abandonedBookingId = abandonedBookingId;
  if (referral) lead.referral = { ...(lead.referral?.toObject?.() || lead.referral || {}), ...referral };
  lead.tags = normalizeTags([...(lead.tags || []), ...(tags || [])]);
  if (!lead.lastActivityAt || eventAt.getTime() > new Date(lead.lastActivityAt).getTime()) lead.lastActivityAt = eventAt;
  await lead.save();

  if (!historyExists) {
    await activity({
      leadId: lead._id,
      type: "SYSTEM",
      title: `New ${sourceLabel(source)} touchpoint captured`,
      body: message,
      metadata: { source, referenceId },
      occurredAt: eventAt,
    });
  }
  return lead;
};

const createLead = async (data: CreateLeadInput, actorId?: string) => {
  const lead = await upsertLeadFromSource({
    ...data,
    source: data.source,
    ownerId: data.ownerId || actorId,
    requestedServiceName: data.requestedServiceName,
    referenceId: `manual:${Date.now()}`,
  });
  if (data.status && data.status !== lead.status) {
    return updateLead(String(lead._id), { status: data.status, nextFollowUpAt: data.nextFollowUpAt } as any, actorId);
  }
  if (data.nextFollowUpAt) {
    await createTask(String(lead._id), {
      title: "Follow up",
      dueAt: data.nextFollowUpAt,
      priority: "MEDIUM",
      assignedTo: data.ownerId || actorId,
    }, actorId);
  }
  return lead;
};

const capturePublicLead = async (data: PublicCaptureLeadInput) => {
  return upsertLeadFromSource({
    ...data,
    source: data.source,
    requestedServiceName: data.requestedServiceName,
    referral: data.referral,
    referenceId: `public:${Date.now()}`,
  });
};

const listLeads = async (query: any) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 30));
  const filter: any = {};
  if (query.status) filter.status = String(query.status).includes(",") ? { $in: String(query.status).split(",") } : query.status;
  if (query.source) filter.source = query.source;
  if (query.ownerId) filter.ownerId = query.ownerId;
  if (query.tag) filter.tags = query.tag;
  if (query.search) {
    const escaped = String(query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: { $regex: escaped, $options: "i" } },
      { email: { $regex: escaped, $options: "i" } },
      { phone: { $regex: escaped, $options: "i" } },
      { requestedServiceName: { $regex: escaped, $options: "i" } },
      { tags: { $regex: escaped, $options: "i" } },
    ];
  }
  const skip = (page - 1) * limit;
  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .populate("ownerId", "name email image")
      .populate("requestedServiceId", "name")
      .populate("customerId", "name email phone")
      .sort({ lastActivityAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Lead.countDocuments(filter),
  ]);
  return { leads, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
};

const pipeline = async (query: any = {}) => {
  const match: any = {};
  if (query.ownerId) match.ownerId = new Types.ObjectId(String(query.ownerId));
  const grouped = await Lead.aggregate([
    { $match: match },
    { $group: { _id: "$status", count: { $sum: 1 }, value: { $sum: "$value" } } },
  ]);
  const map = new Map<string, any>(grouped.map((item: any) => [String(item._id), item]));
  const stages = LEAD_STATUSES.map((status) => ({
    status,
    count: map.get(status)?.count || 0,
    value: map.get(status)?.value || 0,
  }));
  return {
    stages,
    openLeads: stages.filter((stage) => OPEN_STATUSES.includes(stage.status as LeadStatus)).reduce((sum, stage) => sum + stage.count, 0),
    openValue: stages.filter((stage) => OPEN_STATUSES.includes(stage.status as LeadStatus)).reduce((sum, stage) => sum + stage.value, 0),
  };
};


const board = async (query: any = {}) => {
  const perStage = Math.min(50, Math.max(5, Number(query.limitPerStage) || 20));
  const ownerFilter = query.ownerId ? { ownerId: query.ownerId } : {};
  const stages = await Promise.all(
    LEAD_STATUSES.map(async (status) => {
      const [items, total] = await Promise.all([
        Lead.find({ ...ownerFilter, status })
          .populate("ownerId", "name email image")
          .populate("requestedServiceId", "name")
          .populate("customerId", "name email phone")
          .sort({ nextFollowUpAt: 1, lastActivityAt: -1 })
          .limit(perStage)
          .lean(),
        Lead.countDocuments({ ...ownerFilter, status }),
      ]);
      return { status, total, items };
    }),
  );
  return { stages, limitPerStage: perStage };
};

const getLead = async (id: string) => {
  const lead = await Lead.findById(id)
    .populate("ownerId", "name email image")
    .populate("requestedServiceId", "name basePrice image")
    .populate("customerId", "name email phone addresses")
    .lean();
  if (!lead) throw new NotFoundError("Lead not found");
  const [activities, tasks] = await Promise.all([
    LeadActivity.find({ leadId: id }).populate("createdBy", "name email image").sort({ occurredAt: -1 }).limit(250).lean(),
    LeadTask.find({ leadId: id }).populate("assignedTo", "name email image").populate("createdBy", "name email").sort({ status: 1, dueAt: 1 }).lean(),
  ]);
  return { lead, activities, tasks };
};

const convertLead = async (id: string, customerInput: any = {}, actorId?: string, convertedAt?: Date) => {
  const lead = await Lead.findById(id);
  if (!lead) throw new NotFoundError("Lead not found");
  if (lead.customerId) {
    const existing = await Customer.findById(lead.customerId);
    if (existing) return { lead, customer: existing };
  }
  const eventAt = convertedAt || new Date();
  const customer = await customerService.upsertCustomer({
    name: customerInput.name || lead.name,
    email: customerInput.email || lead.email,
    phone: customerInput.phone || lead.phone,
    address: customerInput.address,
    source: lead.source,
    leadId: lead._id,
    activityAt: eventAt,
  });
  const previousStatus = lead.status;
  lead.customerId = customer._id as any;
  lead.status = "WON";
  lead.wonAt = eventAt;
  lead.lostAt = undefined;
  lead.lostReason = undefined;
  lead.nextFollowUpAt = undefined;
  lead.lastActivityAt = eventAt;
  await lead.save();
  await LeadTask.updateMany({ leadId: lead._id, status: "PENDING" }, { $set: { status: "CANCELLED" } });
  await activity({
    leadId: lead._id,
    type: "CUSTOMER_CREATED",
    title: "Lead converted to customer",
    body: previousStatus !== "WON" ? `Pipeline status changed from ${previousStatus} to WON.` : undefined,
    createdBy: actorId,
    metadata: { customerId: String(customer._id) },
    occurredAt: eventAt,
  });
  return { lead, customer };
};

const updateLead = async (id: string, data: UpdateLeadInput, actorId?: string) => {
  const lead = await Lead.findById(id);
  if (!lead) throw new NotFoundError("Lead not found");
  if (lead.status === "WON" && data.status && data.status !== "WON") {
    throw new BadRequestError("Won leads are linked to customers and cannot be reopened from the pipeline");
  }
  if (data.status === "WON") return (await convertLead(id, {}, actorId)).lead;
  const previousStatus = lead.status;

  if (data.name !== undefined) lead.name = data.name;
  if (data.email !== undefined) {
    lead.email = normalizeEmail(data.email);
    lead.normalizedEmail = normalizeEmail(data.email);
  }
  if (data.phone !== undefined) {
    lead.phone = data.phone || undefined;
    lead.normalizedPhone = normalizePhone(data.phone);
  }
  if (data.source !== undefined) lead.source = data.source;
  if (data.status !== undefined) lead.status = data.status;
  if (data.ownerId !== undefined) {
    await assertAdminUser(data.ownerId || undefined, "Lead owner");
    lead.ownerId = data.ownerId ? new Types.ObjectId(data.ownerId) : undefined;
  }
  if (data.value !== undefined) lead.value = data.value;
  if (data.requestedServiceId !== undefined) lead.requestedServiceId = data.requestedServiceId ? new Types.ObjectId(data.requestedServiceId) : undefined;
  if (data.requestedServiceName !== undefined) lead.requestedServiceName = data.requestedServiceName;
  if (data.message !== undefined) lead.message = data.message;
  if (data.notes !== undefined) lead.notes = data.notes;
  if (data.tags !== undefined) lead.tags = normalizeTags(data.tags);
  if (data.referral !== undefined) lead.referral = data.referral as any;
  if (data.lostReason !== undefined) lead.lostReason = data.lostReason;
  if (data.status && data.status !== "LOST" && previousStatus === "LOST") {
    lead.lostAt = undefined;
    lead.lostReason = undefined;
  }

  if (data.status === "LOST") {
    lead.lostAt = new Date();
    lead.wonAt = undefined;
    lead.nextFollowUpAt = undefined;
    await LeadTask.updateMany({ leadId: lead._id, status: "PENDING" }, { $set: { status: "CANCELLED" } });
  }
  lead.lastActivityAt = new Date();
  await lead.save();

  if (data.status && data.status !== previousStatus) {
    await activity({
      leadId: lead._id,
      type: "STATUS_CHANGE",
      title: `Pipeline moved to ${data.status.replace(/_/g, " ")}`,
      body: data.status === "LOST" ? data.lostReason : undefined,
      createdBy: actorId,
      metadata: { from: previousStatus, to: data.status },
    });
  }
  if (data.nextFollowUpAt) {
    await createTask(
      String(lead._id),
      { title: "Follow up", dueAt: data.nextFollowUpAt, priority: "MEDIUM", assignedTo: data.ownerId || String(lead.ownerId || actorId || "") || undefined },
      actorId,
    );
    return (await Lead.findById(lead._id)) || lead;
  }
  return lead;
};

const recordActivity = async (leadId: string, data: CreateLeadActivityInput, actorId?: string) => {
  const lead = await Lead.findById(leadId);
  if (!lead) throw new NotFoundError("Lead not found");
  const entry = await activity({
    leadId,
    type: data.type,
    title: data.title,
    body: data.body,
    direction: data.direction,
    createdBy: actorId,
    metadata: data.metadata,
    occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
  });
  if (["CALL", "EMAIL", "SMS"].includes(data.type) && ["NEW", "ATTEMPTED_CONTACT"].includes(lead.status)) {
    const from = lead.status;
    await Lead.updateOne({ _id: leadId }, { $set: { status: "CONTACTED" } });
    await activity({
      leadId,
      type: "STATUS_CHANGE",
      title: "Pipeline moved to CONTACTED",
      createdBy: actorId,
      metadata: { from, to: "CONTACTED", reason: "communication_recorded" },
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
    });
  }
  return entry;
};

const createTask = async (leadId: string, data: CreateLeadTaskInput, actorId?: string) => {
  const lead = await Lead.findById(leadId);
  if (!lead) throw new NotFoundError("Lead not found");
  if (["WON", "LOST"].includes(lead.status)) throw new BadRequestError("Closed leads cannot receive new follow-up tasks");
  const assignedTo = data.assignedTo || lead.ownerId || actorId;
  await assertAdminUser(assignedTo || undefined, "Task assignee");
  const task = await LeadTask.create({
    leadId,
    title: data.title,
    description: data.description,
    dueAt: await resolveTaskDueAt(data),
    priority: data.priority,
    assignedTo,
    createdBy: actorId,
  });
  await refreshNextFollowUp(leadId);
  await activity({
    leadId,
    type: "FOLLOW_UP",
    title: `Follow-up scheduled: ${task.title}`,
    body: task.description,
    createdBy: actorId,
    metadata: { taskId: String(task._id), dueAt: task.dueAt.toISOString() },
  });
  return task;
};

const updateTask = async (leadId: string, taskId: string, data: UpdateLeadTaskInput, actorId?: string) => {
  const task = await LeadTask.findOne({ _id: taskId, leadId });
  if (!task) throw new NotFoundError("Lead task not found");
  if (data.title !== undefined) task.title = data.title;
  if (data.description !== undefined) task.description = data.description;
  if (data.dueAt !== undefined || data.dueLocal !== undefined) task.dueAt = await resolveTaskDueAt(data);
  if (data.priority !== undefined) task.priority = data.priority;
  if (data.assignedTo !== undefined) {
    await assertAdminUser(data.assignedTo || undefined, "Task assignee");
    task.assignedTo = data.assignedTo ? new Types.ObjectId(data.assignedTo) : undefined;
  }
  if (data.status !== undefined) {
    task.status = data.status;
    task.completedAt = data.status === "COMPLETED" ? new Date() : undefined;
  }
  await task.save();
  await refreshNextFollowUp(leadId);
  if (data.status === "COMPLETED") {
    await activity({ leadId, type: "FOLLOW_UP", title: `Follow-up completed: ${task.title}`, createdBy: actorId, metadata: { taskId } });
  }
  return task;
};

const followUps = async (query: any) => {
  const settings = await getSchedulingSettings();
  const today = formatDateInZone(new Date(), settings.timezone);
  const startToday = zonedDateTimeToUtc(today, "00:00", settings.timezone);
  const startTomorrow = zonedDateTimeToUtc(addDays(today, 1), "00:00", settings.timezone);
  const upcomingEnd = zonedDateTimeToUtc(addDays(today, Math.max(2, Math.min(90, Number(query.days) || 14))), "23:59", settings.timezone);
  const base: any = { status: "PENDING" };
  if (query.ownerId) base.assignedTo = query.ownerId;
  const [overdue, todayTasks, upcoming] = await Promise.all([
    LeadTask.find({ ...base, dueAt: { $lt: startToday } }).populate("leadId", "name email phone status requestedServiceName value").populate("assignedTo", "name email image").sort({ dueAt: 1 }).lean(),
    LeadTask.find({ ...base, dueAt: { $gte: startToday, $lt: startTomorrow } }).populate("leadId", "name email phone status requestedServiceName value").populate("assignedTo", "name email image").sort({ dueAt: 1 }).lean(),
    LeadTask.find({ ...base, dueAt: { $gte: startTomorrow, $lte: upcomingEnd } }).populate("leadId", "name email phone status requestedServiceName value").populate("assignedTo", "name email image").sort({ dueAt: 1 }).lean(),
  ]);
  return { timezone: settings.timezone, date: today, overdue, today: todayTasks, upcoming };
};

const getOwners = async () => User.find({ isDeleted: false, role: "admin" }).select("name email image role").sort({ name: 1 }).lean();

const importLeads = async (rows: any[], actorId?: string) => {
  const results = { imported: 0, merged: 0, failed: 0, errors: [] as Array<{ row: number; message: string }> };
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    try {
      const before = await findOpenLeadByIdentity(row.email, row.phone);
      await upsertLeadFromSource({ ...row, source: "IMPORT", ownerId: row.ownerId || actorId, referenceId: `import:${Date.now()}:${index}` });
      if (before) results.merged += 1;
      else results.imported += 1;
    } catch (error: any) {
      results.failed += 1;
      results.errors.push({ row: index + 1, message: error?.message || "Import failed" });
    }
  }
  return results;
};

export const convertBookingLead = async ({
  bookingSessionId,
  bookingReference,
  name,
  email,
  phone,
  address,
  value,
  occurredAt,
}: {
  bookingSessionId?: string;
  bookingReference: string;
  name: string;
  email?: string;
  phone?: string;
  address?: any;
  value: number;
  occurredAt?: Date;
}) => {
  let lead = bookingSessionId
    ? await Lead.findOne({ "sourceHistory.referenceId": bookingSessionId, status: { $in: OPEN_STATUSES } }).sort({ updatedAt: -1 })
    : null;
  if (!lead) lead = await findOpenLeadByIdentity(email, phone);
  if (!lead) {
    const customer = await customerService.upsertCustomer({
      name,
      email,
      phone,
      address,
      source: "ONLINE_BOOKING",
      activityAt: occurredAt,
    });
    return { lead: null, customer };
  }
  if (value > Number(lead.value || 0)) {
    lead.value = value;
    await lead.save();
  }
  const converted = await convertLead(String(lead._id), { name, email, phone, address }, undefined, occurredAt);
  await activity({
    leadId: lead._id,
    type: "BOOKING",
    title: `Booking created: ${bookingReference}`,
    metadata: { bookingReference, value },
    occurredAt: occurredAt || new Date(),
  });
  return converted;
};

export default {
  createLead,
  capturePublicLead,
  listLeads,
  pipeline,
  board,
  getLead,
  updateLead,
  convertLead,
  recordActivity,
  createTask,
  updateTask,
  followUps,
  getOwners,
  importLeads,
};

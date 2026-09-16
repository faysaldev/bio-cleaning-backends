import crypto from "crypto";
import mongoose from "mongoose";
import Booking from "../Booking/booking.model";
import Customer from "../Customer/customer.model";
import Service from "../Service/service.model";
import StaffSchedule from "../Scheduling/staffSchedule.model";
import Crew from "../Team/crew.model";
import Job, { JobStatus } from "./job.model";
import StaffAssignmentBucket from "./staffAssignmentBucket.model";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../lib/errors";
import { formatDateInZone, formatTimeInZone, minutesFromTime } from "../Scheduling/scheduling.time";
import { getCapacityBucketKeys, getSchedulingSettings } from "../Scheduling/scheduling.services";
import type { RoleType } from "../../config/roles";
import { ensureInvoiceForCompletedJob } from "../Invoice/invoice.services";
import { emitCustomerEvent } from "../Notification/notification.service";

const ACTIVE_JOB_STATUSES: JobStatus[] = ["SCHEDULED", "EN_ROUTE", "IN_PROGRESS", "PAUSED", "ISSUE"];
const managementRoles = new Set(["owner", "admin", "manager", "dispatcher", "support", "read_only"]);

const legacyStart = (booking: any) => {
  const day = new Date(booking.date);
  const label = String(booking.timeSlot || "").toLowerCase();
  const hour = label.includes("afternoon") ? 13 : label.includes("evening") ? 17 : 9;
  day.setUTCHours(hour, 0, 0, 0);
  return day;
};

const jobTimes = (booking: any) => {
  const start = booking.startAt ? new Date(booking.startAt) : legacyStart(booking);
  const duration = Number(booking.durationMinutes || 180);
  const end = booking.endAt ? new Date(booking.endAt) : new Date(start.getTime() + duration * 60_000);
  return { start, end };
};

const defaultChecklist = (service: any) => {
  const items = Array.isArray(service?.includes) && service.includes.length
    ? service.includes
    : ["Arrival walkthrough", "Complete service scope", "Final quality check"];
  return items.slice(0, 60).map((label: string, index: number) => ({
    key: `${index + 1}-${String(label).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 70) || "task"}`,
    label,
    completed: false,
  }));
};

export const ensureJobForBooking = async (bookingOrId: any) => {
  const booking = typeof bookingOrId === "string"
    ? await Booking.findById(bookingOrId)
    : bookingOrId;
  if (!booking) throw new NotFoundError("Booking not found");
  const businessTimezone = booking.businessTimezone || (await getSchedulingSettings()).timezone;
  const { start, end } = jobTimes(booking);
  const [service, customer] = await Promise.all([
    booking.serviceId ? Service.findById(booking.serviceId).select("includes name") : null,
    booking.customerId ? Customer.findById(booking.customerId).select("preferences accessInstructions pets") : null,
  ]);
  const customerContext = [
    booking.notes,
    customer?.accessInstructions ? `Access: ${customer.accessInstructions}` : undefined,
    customer?.preferences?.serviceNotes ? `Service preferences: ${customer.preferences.serviceNotes}` : undefined,
    customer?.preferences?.preferredContactWindow ? `Preferred contact: ${customer.preferences.preferredContactWindow}` : undefined,
    customer?.pets?.length ? `Pets: ${customer.pets.map((pet: any) => [pet.name, pet.type].filter(Boolean).join(" ")).join(", ")}` : undefined,
  ].filter(Boolean).join("\n");

  const status: JobStatus = booking.status === "CANCELLED"
    ? "CANCELLED"
    : booking.status === "COMPLETED"
      ? "COMPLETED"
      : "SCHEDULED";

  const existing = await Job.findOne({ bookingId: booking._id });
  if (existing) {
    const safeToSyncSchedule = ["SCHEDULED", "EN_ROUTE"].includes(existing.status);
    const scheduleChanged = safeToSyncSchedule && (
      existing.scheduledStart.getTime() !== start.getTime() || existing.scheduledEnd.getTime() !== end.getTime()
    );
    existing.customerId = booking.customerId || existing.customerId;
    existing.serviceId = booking.serviceId || existing.serviceId;
    existing.customerName = booking.customerDetails.name;
    existing.customerPhone = booking.customerDetails.phone;
    existing.businessTimezone = businessTimezone;
    existing.address = booking.customerDetails.address;
    existing.customerInstructions = customerContext || existing.customerInstructions;
    if (safeToSyncSchedule) {
      existing.scheduledStart = start;
      existing.scheduledEnd = end;
      if (scheduleChanged && existing.assignedStaffIds.length) {
        // A booking can be rescheduled independently of dispatch. Clear stale field assignments
        // rather than letting a cleaner stay reserved at the old time. Dispatch can reassign
        // against the new schedule after availability checks.
        await StaffAssignmentBucket.deleteMany({ jobId: existing._id });
        existing.assignedStaffIds = [] as any;
        existing.crewId = undefined;
      }
    }
    if (booking.status === "CANCELLED") {
      existing.status = "CANCELLED";
      await StaffAssignmentBucket.deleteMany({ jobId: existing._id });
    }
    if (booking.status === "COMPLETED" && existing.status !== "COMPLETED") {
      existing.status = "COMPLETED";
      existing.actualCompletedAt = existing.actualCompletedAt || new Date();
    }
    await existing.save();
    if (existing.status === "COMPLETED") { try { await ensureInvoiceForCompletedJob(existing); } catch (error) { console.error("Completed job invoice sync failed:", error); } }
    return existing;
  }

  try {
    const createdJob = await Job.create({
      jobNumber: `JOB-${booking.reference}`,
      bookingId: booking._id,
      customerId: booking.customerId,
      serviceId: booking.serviceId,
      status,
      scheduledStart: start,
      scheduledEnd: end,
      businessTimezone,
      address: booking.customerDetails.address,
      customerName: booking.customerDetails.name,
      customerPhone: booking.customerDetails.phone,
      customerInstructions: customerContext,
      checklist: defaultChecklist(service),
      actualCompletedAt: status === "COMPLETED" ? new Date() : undefined,
    });
    if (createdJob.status === "COMPLETED") { try { await ensureInvoiceForCompletedJob(createdJob); } catch (error) { console.error("Completed job invoice sync failed:", error); } }
    return createdJob;
  } catch (error: any) {
    if (error?.code === 11000) {
      const raced = await Job.findOne({ bookingId: booking._id });
      if (raced) return raced;
    }
    throw error;
  }
};

const ensureJobsInRange = async (from: Date, to: Date) => {
  const bookings = await Booking.find({
    $or: [
      { startAt: { $gte: from, $lte: to } },
      { startAt: { $exists: false }, date: { $gte: from, $lte: to } },
    ],
  }).select("+managementTokenHash");
  await Promise.all(bookings.map((booking) => ensureJobForBooking(booking)));
};

const populateJob = (query: any) => query
  .populate("bookingId", "reference status serviceType totalAmount requiredStaffSnapshot frequency payment")
  .populate("serviceId", "name image")
  .populate("customerId", "name email phone")
  .populate("assignedStaffIds", "name email phone role image jobTitle skills")
  .populate({ path: "crewId", select: "name memberIds leadStaffId", populate: { path: "memberIds", select: "name role image" } });

const listJobs = async (query: any) => {
  const now = new Date();
  const from = query.from ? new Date(String(query.from)) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const to = query.to ? new Date(String(query.to)) : new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) throw new BadRequestError("Invalid job date range");
  await ensureJobsInRange(from, to);

  const filter: any = { scheduledStart: { $lte: to }, scheduledEnd: { $gte: from } };
  if (query.status) filter.status = query.status;
  if (query.staffId) filter.assignedStaffIds = query.staffId;
  if (query.crewId) filter.crewId = query.crewId;
  if (query.search) {
    const escaped = String(query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { jobNumber: { $regex: escaped, $options: "i" } },
      { customerName: { $regex: escaped, $options: "i" } },
      { "address.line1": { $regex: escaped, $options: "i" } },
      { "address.city": { $regex: escaped, $options: "i" } },
    ];
  }
  return populateJob(Job.find(filter).sort({ scheduledStart: 1 }));
};

const getJob = async (id: string) => {
  const job = await populateJob(Job.findById(id));
  if (!job) throw new NotFoundError("Job not found");
  return job;
};

const staffAvailabilityForJob = async (staff: any, job: any, timezone: string) => {
  const localDate = formatDateInZone(job.scheduledStart, timezone);
  const dayOfWeek = new Date(`${localDate}T12:00:00.000Z`).getUTCDay();
  const startTime = formatTimeInZone(job.scheduledStart, timezone);
  const endTime = formatTimeInZone(job.scheduledEnd, timezone);
  const hours = staff.weeklyHours?.find((item: any) => item.dayOfWeek === dayOfWeek);
  if (!hours?.isAvailable) return false;
  if (minutesFromTime(startTime) < minutesFromTime(hours.start) || minutesFromTime(endTime) > minutesFromTime(hours.end)) return false;
  return !(staff.timeOff || []).some((entry: any) => entry.startAt < job.scheduledEnd && entry.endAt > job.scheduledStart);
};

const assignJob = async (jobId: string, data: any) => {
  const job: any = await Job.findById(jobId);
  if (!job) throw new NotFoundError("Job not found");
  if (["COMPLETED", "CANCELLED"].includes(job.status)) throw new BadRequestError("Completed or cancelled jobs cannot be reassigned");

  let staffIds = [...new Set((data.staffIds || []).map(String))];
  let crew: any = null;
  if (data.crewId) {
    crew = await Crew.findOne({ _id: data.crewId, isActive: true });
    if (!crew) throw new NotFoundError("Crew not found or inactive");
    staffIds = [...new Set([...staffIds, ...crew.memberIds.map(String)])];
  }
  if (!staffIds.length) {
    await Promise.all([
      StaffAssignmentBucket.deleteMany({ jobId: job._id }),
      Job.updateOne({ _id: job._id }, { $set: { assignedStaffIds: [] }, $unset: { crewId: 1 } }),
    ]);
    return getJob(jobId);
  }

  const staff = await StaffSchedule.find({ _id: { $in: staffIds }, isActive: true, role: "cleaner" });
  if (staff.length !== staffIds.length) throw new BadRequestError("Every assigned person must be an active cleaner");
  const booking: any = await Booking.findById(job.bookingId).select("requiredStaffSnapshot serviceId blockedStartAt blockedEndAt businessTimezone");
  const required = Math.max(1, Number(booking?.requiredStaffSnapshot || 1));

  for (const member of staff) {
    if (booking?.serviceId && member.serviceIds.length && !member.serviceIds.some((id: any) => String(id) === String(booking.serviceId))) {
      throw new BadRequestError(`${member.name} is not qualified for this service`);
    }
  }
  if (crew && booking?.serviceId && crew.serviceIds.length && !crew.serviceIds.some((id: any) => String(id) === String(booking.serviceId))) {
    throw new BadRequestError("The selected crew is not configured for this service");
  }

  const settings = await getSchedulingSettings();
  for (const member of staff) {
    if (!(await staffAvailabilityForJob(member, job, settings.timezone))) {
      throw new ConflictError(`${member.name} is unavailable during this job window`);
    }
  }
  const conflict = await Job.findOne({
    _id: { $ne: job._id },
    status: { $in: ACTIVE_JOB_STATUSES },
    assignedStaffIds: { $in: staffIds },
    scheduledStart: { $lt: job.scheduledEnd },
    scheduledEnd: { $gt: job.scheduledStart },
  }).populate("assignedStaffIds", "name");
  if (conflict) throw new ConflictError(`One or more selected staff members are already assigned to ${conflict.jobNumber}`);

  // Reserve cleaners through the booking's blocked travel/buffer window when available,
  // not only the customer-facing service time. This prevents back-to-back assignments
  // that are impossible to travel between.
  const assignmentStart = booking?.blockedStartAt ? new Date(booking.blockedStartAt) : job.scheduledStart;
  const assignmentEnd = booking?.blockedEndAt ? new Date(booking.blockedEndAt) : job.scheduledEnd;
  const bucketKeys = getCapacityBucketKeys(assignmentStart, assignmentEnd, settings.slotIntervalMinutes);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await StaffAssignmentBucket.deleteMany({ jobId: job._id }).session(session);
      if (staffIds.length && bucketKeys.length) {
        const reservations = staffIds.flatMap((staffId) => bucketKeys.map((bucketKey) => ({
          staffId,
          bucketKey,
          jobId: job._id,
        })));
        await StaffAssignmentBucket.insertMany(reservations, { session, ordered: true });
      }
      const assignmentUpdate = await Job.updateOne(
        { _id: job._id, status: { $nin: ["COMPLETED", "CANCELLED"] } },
        { $set: { assignedStaffIds: staffIds, crewId: data.crewId || null } },
        { session },
      );
      if (assignmentUpdate.modifiedCount !== 1) {
        throw new ConflictError("This job changed while it was being assigned. Refresh dispatch and try again.");
      }
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      throw new ConflictError("One or more selected staff members were just assigned to another job during this time window");
    }
    throw error;
  } finally {
    await session.endSession();
  }
  return getJob(jobId);
};

const staffForUser = async (userId: string) => {
  const staff = await StaffSchedule.findOne({ userId, isActive: true });
  if (!staff) throw new ForbiddenError("No active staff profile is linked to this account");
  return staff;
};

const assertJobAccess = async (job: any, userId: string, role: RoleType) => {
  if (managementRoles.has(role)) return undefined;
  const staff = await staffForUser(userId);
  if (!job.assignedStaffIds.some((id: any) => String(id) === String(staff._id))) {
    throw new ForbiddenError("This job is not assigned to you");
  }
  return staff;
};

const getMyJobs = async (userId: string, query: any = {}) => {
  const staff = await staffForUser(userId);
  const settings = await getSchedulingSettings();
  const today = query.date || formatDateInZone(new Date(), settings.timezone);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new BadRequestError("Date must use YYYY-MM-DD");
  const start = new Date(`${today}T00:00:00.000Z`);
  const end = new Date(`${today}T23:59:59.999Z`);
  // Sync a wider UTC range because the business timezone may cross UTC midnight.
  await ensureJobsInRange(new Date(start.getTime() - 24 * 60 * 60 * 1000), new Date(end.getTime() + 24 * 60 * 60 * 1000));
  const jobs: any[] = await populateJob(Job.find({
    assignedStaffIds: staff._id,
    status: { $ne: "CANCELLED" },
    scheduledStart: { $gte: new Date(start.getTime() - 24 * 60 * 60 * 1000), $lte: new Date(end.getTime() + 24 * 60 * 60 * 1000) },
  }).sort({ scheduledStart: 1 }));
  return jobs.filter((job) => formatDateInZone(job.scheduledStart, settings.timezone) === today);
};

const getMyOverview = async (userId: string) => {
  const settings = await getSchedulingSettings();
  const staff = await staffForUser(userId);
  const today = formatDateInZone(new Date(), settings.timezone);
  const jobs = await getMyJobs(userId, { date: today });
  return {
    staff,
    timezone: settings.timezone,
    date: today,
    jobs,
    summary: {
      total: jobs.length,
      scheduled: jobs.filter((job: any) => job.status === "SCHEDULED" || job.status === "EN_ROUTE").length,
      active: jobs.filter((job: any) => ["IN_PROGRESS", "PAUSED", "ISSUE"].includes(job.status)).length,
      completed: jobs.filter((job: any) => job.status === "COMPLETED").length,
    },
  };
};

const updateStatus = async (jobId: string, nextStatus: JobStatus, userId: string, role: RoleType) => {
  const job: any = await Job.findById(jobId);
  if (!job) throw new NotFoundError("Job not found");
  await assertJobAccess(job, userId, role);
  if (nextStatus === "CANCELLED") throw new BadRequestError("Cancel the booking from the booking workspace so capacity and customer notifications stay consistent");
  if (job.status === "CANCELLED" || job.status === "COMPLETED") throw new BadRequestError("This job is already closed");

  const allowed: Record<JobStatus, JobStatus[]> = {
    SCHEDULED: ["EN_ROUTE", "IN_PROGRESS", "ISSUE", "CANCELLED"],
    EN_ROUTE: ["IN_PROGRESS", "ISSUE", "CANCELLED"],
    IN_PROGRESS: ["PAUSED", "ISSUE", "COMPLETED", "CANCELLED"],
    PAUSED: ["IN_PROGRESS", "ISSUE", "CANCELLED"],
    ISSUE: ["IN_PROGRESS", "PAUSED", "COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
  };
  if (!allowed[job.status].includes(nextStatus)) throw new BadRequestError(`Cannot move job from ${job.status} to ${nextStatus}`);

  if (nextStatus === "COMPLETED") {
    const incomplete = job.checklist.filter((item: any) => !item.completed);
    if (incomplete.length) throw new BadRequestError("Complete every service checklist item before finishing the job");
    const urgentOpen = job.issues.some((issue: any) => issue.status === "OPEN" && issue.severity === "URGENT");
    if (urgentOpen) throw new BadRequestError("Resolve urgent issues before completing the job");
    job.actualCompletedAt = new Date();
  }
  if (["EN_ROUTE", "IN_PROGRESS"].includes(nextStatus)) {
    const booking: any = await Booking.findById(job.bookingId).select("requiredStaffSnapshot");
    const required = Math.max(1, Number(booking?.requiredStaffSnapshot || 1));
    if (job.assignedStaffIds.length < required) {
      throw new BadRequestError(`Assign at least ${required} staff member${required === 1 ? "" : "s"} before starting field work`);
    }
  }
  if (nextStatus === "IN_PROGRESS" && !job.actualStartedAt) job.actualStartedAt = new Date();
  job.status = nextStatus;
  await job.save();

  if (nextStatus === "COMPLETED") {
    await StaffAssignmentBucket.deleteMany({ jobId: job._id });
    await Booking.findByIdAndUpdate(job.bookingId, { status: "COMPLETED" });
    try { await ensureInvoiceForCompletedJob(job); } catch (error) { console.error("Job completed but invoice generation failed:", error); }
  }
  if (["EN_ROUTE", "IN_PROGRESS", "PAUSED", "ISSUE"].includes(nextStatus)) {
    await Booking.updateOne({ _id: job.bookingId, status: "PENDING" }, { $set: { status: "CONFIRMED" } });
  }
  if (nextStatus === "EN_ROUTE" || nextStatus === "COMPLETED") {
    try {
      const booking: any = await Booking.findById(job.bookingId).lean();
      if (booking) {
        await emitCustomerEvent({
          customerId: booking.customerId ? String(booking.customerId) : undefined,
          bookingId: String(booking._id),
          type: nextStatus === "EN_ROUTE" ? "CLEANER_ON_WAY" : "JOB_COMPLETED",
          title: nextStatus === "EN_ROUTE" ? "Your cleaning team is on the way" : "Your cleaning is complete",
          message: nextStatus === "EN_ROUTE"
            ? `Your BIO Cleaning team is on the way for booking ${booking.reference}.`
            : `Your ${booking.serviceType} visit ${booking.reference} is complete. Thank you for choosing BIO Cleaning.`,
          href: "/portal/bookings",
          email: booking.customerDetails?.email,
          phone: booking.customerDetails?.phone,
          dedupeKey: `${nextStatus === "EN_ROUTE" ? "cleaner-on-way" : "job-completed"}:${job._id}`,
        });
      }
    } catch (error) { console.error("Field status changed but customer notification failed:", error); }
  }
  return getJob(jobId);
};

const updateChecklist = async (jobId: string, data: any, userId: string, role: RoleType) => {
  const job: any = await Job.findById(jobId);
  if (!job) throw new NotFoundError("Job not found");
  await assertJobAccess(job, userId, role);
  const item = job.checklist.find((entry: any) => entry.key === data.key);
  if (!item) throw new NotFoundError("Checklist item not found");
  item.completed = data.completed;
  item.completedAt = data.completed ? new Date() : undefined;
  item.completedBy = data.completed ? userId : undefined;
  await job.save();
  return getJob(jobId);
};

const addPhoto = async (jobId: string, data: any, userId: string, role: RoleType) => {
  const job: any = await Job.findById(jobId);
  if (!job) throw new NotFoundError("Job not found");
  await assertJobAccess(job, userId, role);
  job.photos.push({ key: crypto.randomUUID(), ...data, uploadedAt: new Date(), uploadedBy: userId });
  await job.save();
  return getJob(jobId);
};

const addNote = async (jobId: string, text: string, userId: string, role: RoleType) => {
  const job: any = await Job.findById(jobId);
  if (!job) throw new NotFoundError("Job not found");
  await assertJobAccess(job, userId, role);
  job.internalNotes.push({ text, createdAt: new Date(), createdBy: userId });
  await job.save();
  return getJob(jobId);
};

const reportIssue = async (jobId: string, data: any, userId: string, role: RoleType) => {
  const job: any = await Job.findById(jobId);
  if (!job) throw new NotFoundError("Job not found");
  await assertJobAccess(job, userId, role);
  job.issues.push({ key: crypto.randomUUID(), ...data, status: "OPEN", reportedAt: new Date(), reportedBy: userId });
  if (!["COMPLETED", "CANCELLED"].includes(job.status)) job.status = "ISSUE";
  await job.save();
  return getJob(jobId);
};

const resolveIssue = async (jobId: string, issueKey: string, resolution: string, userId: string, role: RoleType) => {
  const job: any = await Job.findById(jobId);
  if (!job) throw new NotFoundError("Job not found");
  await assertJobAccess(job, userId, role);
  const issue = job.issues.find((entry: any) => entry.key === issueKey);
  if (!issue) throw new NotFoundError("Issue not found");
  issue.status = "RESOLVED";
  issue.resolvedAt = new Date();
  issue.resolution = resolution;
  if (job.status === "ISSUE" && !job.issues.some((entry: any) => entry.status === "OPEN")) job.status = job.actualStartedAt ? "IN_PROGRESS" : "SCHEDULED";
  await job.save();
  return getJob(jobId);
};

const getAccessibleJob = async (jobId: string, userId: string, role: RoleType) => {
  const job: any = await Job.findById(jobId);
  if (!job) throw new NotFoundError("Job not found");
  await assertJobAccess(job, userId, role);
  return getJob(jobId);
};

const backfillJobs = async () => {
  const bookings = await Booking.find({});
  let createdOrSynced = 0;
  for (const booking of bookings) {
    await ensureJobForBooking(booking);
    createdOrSynced += 1;
  }
  return { processed: createdOrSynced };
};

export default {
  ensureJobForBooking,
  listJobs,
  getJob,
  getAccessibleJob,
  assignJob,
  getMyJobs,
  getMyOverview,
  updateStatus,
  updateChecklist,
  addPhoto,
  addNote,
  reportIssue,
  resolveIssue,
  backfillJobs,
};

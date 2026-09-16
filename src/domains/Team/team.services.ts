import crypto from "crypto";
import { Types } from "mongoose";
import User from "../Admin-Auth/user.model";
import AuthSession from "../Auth/authSession.model";
import StaffSchedule from "../Scheduling/staffSchedule.model";
import Crew from "./crew.model";
import Job from "../FieldOps/job.model";
import StaffAssignmentBucket from "../FieldOps/staffAssignmentBucket.model";
import Service from "../Service/service.model";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../lib/errors";
import { getSchedulingSettings } from "../Scheduling/scheduling.services";
import { minutesFromTime, zonedDateTimeToUtc } from "../Scheduling/scheduling.time";
import { sendEmail } from "../../lib/mail.service";
import type { RoleType } from "../../config/roles";

const roleRank: Record<string, number> = {
  owner: 100,
  admin: 90,
  manager: 70,
  dispatcher: 60,
  support: 40,
  read_only: 20,
  cleaner: 10,
};

const canManageRole = (actorRole: string, targetRole: string) => {
  if (actorRole === "owner") return targetRole !== "owner";
  if (actorRole === "admin") return !["owner", "admin"].includes(targetRole);
  if (actorRole === "manager") return ["dispatcher", "cleaner", "support", "read_only"].includes(targetRole);
  return false;
};

const assertManageRole = (actorRole: string, targetRole: string) => {
  if (!canManageRole(actorRole, targetRole)) {
    throw new ForbiddenError("Your role cannot create or modify this staff role");
  }
};

const defaultStaffHours = async () => {
  const settings = await getSchedulingSettings();
  return settings.weeklyHours.map((day) => ({
    dayOfWeek: day.dayOfWeek,
    isAvailable: day.isOpen,
    start: day.start,
    end: day.end,
  }));
};

const normalizeTimeOff = async (entries: any[] = []) => {
  const settings = await getSchedulingSettings();
  return entries.map((entry) => {
    const startAt = entry.startLocal
      ? zonedDateTimeToUtc(entry.startLocal.slice(0, 10), entry.startLocal.slice(11), settings.timezone)
      : new Date(entry.startAt);
    const endAt = entry.endLocal
      ? zonedDateTimeToUtc(entry.endLocal.slice(0, 10), entry.endLocal.slice(11), settings.timezone)
      : new Date(entry.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      throw new BadRequestError("Time off must end after it starts");
    }
    return { startAt, endAt, reason: entry.reason };
  });
};

const validateHours = (weeklyHours?: any[]) => {
  if (!weeklyHours) return;
  const seen = new Set<number>();
  for (const day of weeklyHours) {
    if (seen.has(day.dayOfWeek)) throw new BadRequestError("Only one availability row per weekday is allowed");
    seen.add(day.dayOfWeek);
    if (day.isAvailable && minutesFromTime(day.end) <= minutesFromTime(day.start)) {
      throw new BadRequestError(`Availability for day ${day.dayOfWeek} must end after it starts`);
    }
  }
};

const assertServices = async (serviceIds: string[] = []) => {
  if (!serviceIds.length) return;
  const count = await Service.countDocuments({ _id: { $in: serviceIds } });
  if (count !== new Set(serviceIds).size) throw new BadRequestError("One or more selected services do not exist");
};

const publicStaff = async (staff: any) => {
  const crews = await Crew.find({ memberIds: staff._id, isActive: true }).select("name").lean();
  const raw = typeof staff.toObject === "function" ? staff.toObject() : staff;
  return { ...raw, crews };
};

const listStaff = async (query: any = {}) => {
  const filter: any = {};
  if (query.active === "true") filter.isActive = true;
  if (query.active === "false") filter.isActive = false;
  if (query.role) filter.role = query.role;
  if (query.search) {
    const escaped = String(query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: { $regex: escaped, $options: "i" } },
      { email: { $regex: escaped, $options: "i" } },
      { phone: { $regex: escaped, $options: "i" } },
      { skills: { $regex: escaped, $options: "i" } },
    ];
  }
  const staff = await StaffSchedule.find(filter)
    .populate("serviceIds", "name")
    .sort({ isActive: -1, role: 1, name: 1 });
  return Promise.all(staff.map(publicStaff));
};

const getStaff = async (id: string) => {
  const staff = await StaffSchedule.findById(id).populate("serviceIds", "name");
  if (!staff) throw new NotFoundError("Staff member not found");
  return publicStaff(staff);
};

const createStaff = async (data: any, actorRole: RoleType) => {
  assertManageRole(actorRole, data.role);
  validateHours(data.weeklyHours);
  await assertServices(data.serviceIds);
  const existing = await User.findOne({ email: data.email.toLowerCase() });
  if (existing) throw new ConflictError("A login already exists for this email address");

  const temporaryPassword = data.password || `${crypto.randomBytes(8).toString("hex")}Aa1!`;
  const user = await User.create({
    name: data.name,
    email: data.email,
    password: temporaryPassword,
    image: data.image,
    role: data.role,
  });

  try {
    const staff = await StaffSchedule.create({
      userId: user._id,
      employeeCode: `BIO-${String(user._id).slice(-6).toUpperCase()}`,
      name: data.name,
      email: data.email,
      phone: data.phone,
      image: data.image,
      role: data.role,
      jobTitle: data.jobTitle,
      skills: data.skills || [],
      serviceIds: data.serviceIds || [],
      capacityUnits: data.capacityUnits || 1,
      weeklyHours: data.weeklyHours?.length ? data.weeklyHours : await defaultStaffHours(),
      timeOff: await normalizeTimeOff(data.timeOff),
      emergencyContact: data.emergencyContact,
      notes: data.notes,
      isActive: true,
    });

    try {
      await sendEmail(
        data.email,
        "Your BIO Cleaning staff account",
        `Your BIO Cleaning staff account is ready. Sign in with ${data.email}. Your temporary password is ${temporaryPassword}. Change it immediately after signing in.`,
      );
    } catch (error) {
      console.error("Staff account created but invitation email failed:", error);
    }

    return { staff: await publicStaff(staff), temporaryPassword: data.password ? undefined : temporaryPassword };
  } catch (error) {
    await User.deleteOne({ _id: user._id });
    throw error;
  }
};

const updateStaff = async (id: string, data: any, actorRole: RoleType) => {
  const staff = await StaffSchedule.findById(id);
  if (!staff) throw new NotFoundError("Staff member not found");
  assertManageRole(actorRole, data.role || staff.role);
  if (roleRank[actorRole] <= roleRank[staff.role] && actorRole !== "owner") {
    throw new ForbiddenError("You cannot modify a staff member with an equal or higher role");
  }
  validateHours(data.weeklyHours);
  if (data.serviceIds) await assertServices(data.serviceIds);
  if (data.email && data.email !== staff.email) {
    const duplicate = await User.findOne({ email: data.email.toLowerCase(), _id: { $ne: staff.userId } });
    if (duplicate) throw new ConflictError("A login already exists for this email address");
  }

  const normalized: any = { ...data };
  if (data.timeOff) normalized.timeOff = await normalizeTimeOff(data.timeOff);
  delete normalized.password;
  Object.assign(staff, normalized);
  await staff.save();

  if (staff.userId) {
    await User.findByIdAndUpdate(staff.userId, {
      ...(data.name ? { name: data.name } : {}),
      ...(data.email ? { email: data.email } : {}),
      ...(data.image ? { image: data.image } : {}),
      ...(data.role ? { role: data.role } : {}),
      ...(typeof data.isActive === "boolean" ? { isDeleted: !data.isActive } : {}),
    }, { runValidators: true });
    if (data.role || data.isActive === false) await AuthSession.deleteMany({ userId: staff.userId });
  }
  return publicStaff(staff);
};

const deactivateStaff = async (id: string, actorRole: RoleType) => {
  const staff = await StaffSchedule.findById(id);
  if (!staff) throw new NotFoundError("Staff member not found");
  assertManageRole(actorRole, staff.role);
  const activeAssignment = await Job.findOne({
    assignedStaffIds: staff._id,
    status: { $in: ["SCHEDULED", "EN_ROUTE", "IN_PROGRESS", "PAUSED", "ISSUE"] },
  }).select("jobNumber");
  if (activeAssignment) {
    throw new ConflictError(`Reassign ${activeAssignment.jobNumber} before deactivating this staff member`);
  }
  staff.isActive = false;
  await staff.save();
  if (staff.userId) {
    await User.findByIdAndUpdate(staff.userId, { isDeleted: true });
    await AuthSession.deleteMany({ userId: staff.userId });
  }
  await Crew.updateMany({ memberIds: staff._id }, { $pull: { memberIds: staff._id } });
  await Crew.updateMany({ leadStaffId: staff._id }, { $unset: { leadStaffId: 1 } });
  await StaffAssignmentBucket.deleteMany({ staffId: staff._id });
  return staff;
};

const assertCrewMembers = async (memberIds: string[] = [], leadStaffId?: string) => {
  const all = [...new Set([...memberIds, ...(leadStaffId ? [leadStaffId] : [])])];
  if (!all.length) return;
  const members = await StaffSchedule.find({ _id: { $in: all }, isActive: true }).select("_id role");
  if (members.length !== all.length) throw new BadRequestError("All crew members must be active staff members");
  if (members.some((member) => member.role !== "cleaner")) {
    throw new BadRequestError("Field crews can only contain active cleaner accounts");
  }
  if (leadStaffId && !memberIds.includes(leadStaffId)) throw new BadRequestError("Crew lead must also be a crew member");
};

const listCrews = async () => Crew.find().populate("memberIds", "name email role image skills").populate("leadStaffId", "name email role image").populate("serviceIds", "name").sort({ isActive: -1, name: 1 });

const createCrew = async (data: any) => {
  await assertCrewMembers(data.memberIds, data.leadStaffId);
  await assertServices(data.serviceIds);
  return Crew.create(data);
};

const updateCrew = async (id: string, data: any) => {
  const existing = await Crew.findById(id);
  if (!existing) throw new NotFoundError("Crew not found");
  const memberIds = data.memberIds || existing.memberIds.map(String);
  const leadStaffId = data.leadStaffId === null ? undefined : (data.leadStaffId || existing.leadStaffId?.toString());
  await assertCrewMembers(memberIds.map(String), leadStaffId);
  if (data.serviceIds) await assertServices(data.serviceIds);
  const update = { ...data };
  if (data.leadStaffId === null) delete update.leadStaffId;
  const crew = await Crew.findByIdAndUpdate(id, data.leadStaffId === null ? { $set: update, $unset: { leadStaffId: 1 } } : update, { new: true, runValidators: true });
  if (!crew) throw new NotFoundError("Crew not found");
  return crew;
};

const deactivateCrew = async (id: string) => {
  const activeAssignment = await Job.findOne({
    crewId: id,
    status: { $in: ["SCHEDULED", "EN_ROUTE", "IN_PROGRESS", "PAUSED", "ISSUE"] },
  }).select("jobNumber");
  if (activeAssignment) {
    throw new ConflictError(`Reassign ${activeAssignment.jobNumber} before deactivating this crew`);
  }
  const crew = await Crew.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!crew) throw new NotFoundError("Crew not found");
  return crew;
};

const getMyStaffProfile = async (userId: string) => {
  const staff = await StaffSchedule.findOne({ userId, isActive: true }).populate("serviceIds", "name");
  if (!staff) throw new NotFoundError("No active staff profile is linked to this account");
  return publicStaff(staff);
};

export default {
  listStaff,
  getStaff,
  createStaff,
  updateStaff,
  deactivateStaff,
  listCrews,
  createCrew,
  updateCrew,
  deactivateCrew,
  getMyStaffProfile,
};

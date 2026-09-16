import { Types } from "mongoose";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import SchedulingSettings from "./schedulingSettings.model";
import StaffSchedule from "./staffSchedule.model";
import ScheduleBlock from "./scheduleBlock.model";
import { assertTimeZone, minutesFromTime, zonedDateTimeToUtc } from "./scheduling.time";

export const getSchedulingSettings = async () => {
  let settings = await SchedulingSettings.findById("default");
  if (!settings) settings = await SchedulingSettings.create({ _id: "default" });
  return settings;
};

const updateSettings = async (data: any) => {
  if (data.timezone) {
    try {
      assertTimeZone(data.timezone);
    } catch {
      throw new BadRequestError("Timezone must be a valid IANA timezone, for example America/New_York");
    }
  }
  if (data.weeklyHours) {
    for (const day of data.weeklyHours) {
      if (day.isOpen && minutesFromTime(day.end) <= minutesFromTime(day.start)) {
        throw new BadRequestError(`Opening hours for day ${day.dayOfWeek} must end after they start`);
      }
    }
  }
  return SchedulingSettings.findByIdAndUpdate("default", data, {
    new: true,
    upsert: true,
    runValidators: true,
    setDefaultsOnInsert: true,
  });
};

const getPublicConfig = async () => {
  const settings = await getSchedulingSettings();
  return {
    timezone: settings.timezone,
    slotIntervalMinutes: settings.slotIntervalMinutes,
    bookingLeadTimeHours: settings.bookingLeadTimeHours,
    bookingHorizonDays: settings.bookingHorizonDays,
    weeklyHours: settings.weeklyHours,
    closedDates: settings.closedDates,
    cancellationPolicy: {
      noticeHours: settings.cancellationNoticeHours,
      rescheduleNoticeHours: settings.rescheduleNoticeHours,
      allowLateCancellation: settings.allowLateCancellation,
      lateCancellationFeePercent: settings.lateCancellationFeePercent,
    },
    payment: {
      depositPolicy: settings.depositPolicy,
      depositType: settings.depositType,
      depositValue: settings.depositValue,
      currency: settings.currency,
    },
    recurrenceMaxOccurrences: settings.recurrenceMaxOccurrences,
  };
};

const listStaff = async () => StaffSchedule.find().sort({ isActive: -1, name: 1 });

const businessLocalToUtc = (value: string, timezone: string) => {
  const [date, time] = value.split("T");
  return zonedDateTimeToUtc(date, time, timezone);
};

const normalizeTimeOff = async (entries: any[] | undefined) => {
  if (!entries) return undefined;
  const settings = await getSchedulingSettings();
  return entries.map((entry) => {
    const startAt = entry.startLocal
      ? businessLocalToUtc(entry.startLocal, settings.timezone)
      : new Date(entry.startAt);
    const endAt = entry.endLocal
      ? businessLocalToUtc(entry.endLocal, settings.timezone)
      : new Date(entry.endAt);
    if (!(startAt instanceof Date) || Number.isNaN(startAt.getTime()) || !(endAt instanceof Date) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      throw new BadRequestError("Staff time off must end after it starts");
    }
    return { startAt, endAt, reason: entry.reason };
  });
};

const validateStaffHours = (weeklyHours: any[] | undefined) => {
  if (!weeklyHours) return;
  for (const day of weeklyHours) {
    if (day.isAvailable && minutesFromTime(day.end) <= minutesFromTime(day.start)) {
      throw new BadRequestError(`Staff hours for day ${day.dayOfWeek} must end after they start`);
    }
  }
};

const createStaff = async (data: any) => {
  validateStaffHours(data.weeklyHours);
  const timeOff = await normalizeTimeOff(data.timeOff);
  return StaffSchedule.create({ ...data, ...(timeOff ? { timeOff } : {}) });
};

const updateStaff = async (id: string, data: any) => {
  validateStaffHours(data.weeklyHours);
  const timeOff = await normalizeTimeOff(data.timeOff);
  const staff = await StaffSchedule.findByIdAndUpdate(
    id,
    { ...data, ...(timeOff ? { timeOff } : {}) },
    { new: true, runValidators: true },
  );
  if (!staff) throw new NotFoundError("Staff schedule not found");
  return staff;
};

const deleteStaff = async (id: string) => {
  const staff = await StaffSchedule.findByIdAndDelete(id);
  if (!staff) throw new NotFoundError("Staff schedule not found");
  return staff;
};

const listBlocks = async () => ScheduleBlock.find().sort({ startAt: 1 });

const normalizeBlockTimes = async (data: any, existing?: any) => {
  const settings = await getSchedulingSettings();
  const startAt = data.startLocal
    ? businessLocalToUtc(data.startLocal, settings.timezone)
    : data.startAt
      ? new Date(data.startAt)
      : existing?.startAt;
  const endAt = data.endLocal
    ? businessLocalToUtc(data.endLocal, settings.timezone)
    : data.endAt
      ? new Date(data.endAt)
      : existing?.endAt;
  if (!startAt || !endAt || endAt <= startAt) {
    throw new BadRequestError("Block end must be after its start");
  }
  const normalized = { ...data, startAt, endAt };
  delete normalized.startLocal;
  delete normalized.endLocal;
  return normalized;
};

const createBlock = async (data: any) => ScheduleBlock.create(await normalizeBlockTimes(data));

const updateBlock = async (id: string, data: any) => {
  const existing = await ScheduleBlock.findById(id);
  if (!existing) throw new NotFoundError("Schedule block not found");
  const normalized = await normalizeBlockTimes(data, existing);
  const block = await ScheduleBlock.findByIdAndUpdate(id, normalized, {
    new: true,
    runValidators: true,
  });
  if (!block) throw new NotFoundError("Schedule block not found");
  return block;
};

const deleteBlock = async (id: string) => {
  const block = await ScheduleBlock.findByIdAndDelete(id);
  if (!block) throw new NotFoundError("Schedule block not found");
  return block;
};

export const getOpeningHoursForDate = async (date: string) => {
  const settings = await getSchedulingSettings();
  if (settings.closedDates.some((entry) => entry.date === date)) {
    return { settings, isClosed: true, hours: null as any };
  }
  const dayOfWeek = new Date(`${date}T12:00:00.000Z`).getUTCDay();
  const hours = settings.weeklyHours.find((item) => item.dayOfWeek === dayOfWeek);
  return { settings, isClosed: !hours?.isOpen, hours };
};

const staffCoversLocalRange = (
  staff: any,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  blockedStartAt: Date,
  blockedEndAt: Date,
) => {
  const day = staff.weeklyHours?.find((item: any) => item.dayOfWeek === dayOfWeek);
  if (!day?.isAvailable) return false;
  if (minutesFromTime(startTime) < minutesFromTime(day.start)) return false;
  if (minutesFromTime(endTime) > minutesFromTime(day.end)) return false;
  const onTimeOff = (staff.timeOff || []).some(
    (entry: any) => entry.startAt < blockedEndAt && entry.endAt > blockedStartAt,
  );
  return !onTimeOff;
};

export const getEffectiveCapacity = async ({
  serviceId,
  date,
  startTime,
  endTime,
  blockedStartAt,
  blockedEndAt,
}: {
  serviceId: string;
  date: string;
  startTime: string;
  endTime: string;
  blockedStartAt: Date;
  blockedEndAt: Date;
}) => {
  const settings = await getSchedulingSettings();
  const dayOfWeek = new Date(`${date}T12:00:00.000Z`).getUTCDay();
  const staff = await StaffSchedule.find({
    isActive: true,
    $or: [{ serviceIds: { $size: 0 } }, { serviceIds: new Types.ObjectId(serviceId) }],
  });

  const staffCapacity = staff.length
    ? staff
        .filter((member) =>
          staffCoversLocalRange(member, dayOfWeek, startTime, endTime, blockedStartAt, blockedEndAt),
        )
        .reduce((sum, member) => sum + (member.capacityUnits || 1), 0)
    : settings.defaultCrewCapacity;

  const blocks = await ScheduleBlock.find({
    startAt: { $lt: blockedEndAt },
    endAt: { $gt: blockedStartAt },
    $or: [{ serviceId: { $exists: false } }, { serviceId: null }, { serviceId: new Types.ObjectId(serviceId) }],
  }).select("capacityReduction");
  const reduction = blocks.reduce((sum, block) => sum + (block.capacityReduction || 0), 0);
  return Math.max(0, staffCapacity - reduction);
};

export const getCapacityBucketKeys = (startAt: Date, endAt: Date, intervalMinutes: number) => {
  const intervalMs = intervalMinutes * 60_000;
  const start = Math.floor(startAt.getTime() / intervalMs) * intervalMs;
  const keys: string[] = [];
  for (let timestamp = start; timestamp < endAt.getTime(); timestamp += intervalMs) {
    keys.push(new Date(timestamp).toISOString());
  }
  return keys;
};

const schedulingService = {
  getSettings: getSchedulingSettings,
  updateSettings,
  getPublicConfig,
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  listBlocks,
  createBlock,
  updateBlock,
  deleteBlock,
};

export default schedulingService;

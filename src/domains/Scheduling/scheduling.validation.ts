import { z } from "zod";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must use HH:mm");
const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/, "Local date/time must use YYYY-MM-DDTHH:mm");
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

const weeklyHourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isOpen: z.boolean(),
  start: hhmm,
  end: hhmm,
});

export const updateSchedulingSettingsSchema = z.object({
  timezone: z.string().trim().min(1).max(100).optional(),
  slotIntervalMinutes: z.number().int().min(15).max(180).optional(),
  bookingLeadTimeHours: z.number().min(0).max(720).optional(),
  bookingHorizonDays: z.number().int().min(1).max(365).optional(),
  defaultTravelBufferMinutes: z.number().int().min(0).max(240).optional(),
  defaultCrewCapacity: z.number().int().min(1).max(100).optional(),
  cancellationNoticeHours: z.number().min(0).max(720).optional(),
  rescheduleNoticeHours: z.number().min(0).max(720).optional(),
  allowLateCancellation: z.boolean().optional(),
  lateCancellationFeePercent: z.number().min(0).max(100).optional(),
  depositPolicy: z.enum(["NONE", "OPTIONAL", "REQUIRED"]).optional(),
  depositType: z.enum(["PERCENT", "FIXED"]).optional(),
  depositValue: z.number().min(0).optional(),
  currency: z.string().trim().min(3).max(3).transform((value) => value.toUpperCase()).optional(),
  recurrenceMaxOccurrences: z.number().int().min(1).max(52).optional(),
  weeklyHours: z.array(weeklyHourSchema).length(7).optional(),
  closedDates: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        reason: z.string().trim().max(200).optional(),
      }),
    )
    .max(180)
    .optional(),
});

const staffWeeklyHourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isAvailable: z.boolean(),
  start: hhmm,
  end: hhmm,
});

export const createStaffScheduleSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  isActive: z.boolean().optional().default(true),
  capacityUnits: z.number().int().min(1).max(10).optional().default(1),
  serviceIds: z.array(objectId).max(100).optional().default([]),
  weeklyHours: z.array(staffWeeklyHourSchema).max(7).optional().default([]),
  timeOff: z
    .array(
      z.union([
        z.object({
          startAt: z.coerce.date(),
          endAt: z.coerce.date(),
          reason: z.string().trim().max(200).optional(),
        }),
        z.object({
          startLocal: localDateTime,
          endLocal: localDateTime,
          reason: z.string().trim().max(200).optional(),
        }),
      ]),
    )
    .max(100)
    .optional()
    .default([]),
});

export const updateStaffScheduleSchema = createStaffScheduleSchema.partial();

const scheduleBlockFields = {
  title: z.string().trim().min(1).max(160),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
  startLocal: localDateTime.optional(),
  endLocal: localDateTime.optional(),
  capacityReduction: z.number().int().min(1).max(999).optional().default(999),
  serviceId: objectId.optional(),
};

export const createScheduleBlockSchema = z
  .object(scheduleBlockFields)
  .superRefine((value, ctx) => {
    const hasAbsolute = Boolean(value.startAt && value.endAt);
    const hasLocal = Boolean(value.startLocal && value.endLocal);
    if (!hasAbsolute && !hasLocal) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Provide both start and end times", path: ["startAt"] });
    }
    if (hasAbsolute && value.endAt! <= value.startAt!) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Block end must be after its start", path: ["endAt"] });
    }
  });

export const updateScheduleBlockSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
  startLocal: localDateTime.optional(),
  endLocal: localDateTime.optional(),
  capacityReduction: z.number().int().min(1).max(999).optional(),
  serviceId: objectId.nullable().optional(),
});

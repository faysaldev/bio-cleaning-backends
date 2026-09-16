import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must use HH:mm");
const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/, "Local date/time must use YYYY-MM-DDTHH:mm");
const staffRole = z.enum(["owner", "admin", "manager", "dispatcher", "cleaner", "support", "read_only"]);

const scheduleDay = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isAvailable: z.boolean(),
  start: hhmm,
  end: hhmm,
});

const timeOff = z.union([
  z.object({ startAt: z.coerce.date(), endAt: z.coerce.date(), reason: z.string().trim().max(240).optional() }),
  z.object({ startLocal: localDateTime, endLocal: localDateTime, reason: z.string().trim().max(240).optional() }),
]);

export const createStaffProfileSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().max(40).optional(),
  image: z.string().url().max(2048).optional(),
  role: staffRole.default("cleaner"),
  jobTitle: z.string().trim().max(120).optional(),
  skills: z.array(z.string().trim().min(1).max(100)).max(50).optional().default([]),
  serviceIds: z.array(objectId).max(100).optional().default([]),
  capacityUnits: z.number().int().min(1).max(10).optional().default(1),
  weeklyHours: z.array(scheduleDay).max(7).optional(),
  timeOff: z.array(timeOff).max(200).optional().default([]),
  emergencyContact: z.object({
    name: z.string().trim().max(120).optional(),
    phone: z.string().trim().max(40).optional(),
    relationship: z.string().trim().max(80).optional(),
  }).optional(),
  notes: z.string().trim().max(3000).optional(),
  password: z.string().min(10).max(128).optional(),
});

export const updateStaffProfileSchema = createStaffProfileSchema.omit({ password: true }).partial();

export const createCrewSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  memberIds: z.array(objectId).max(50).optional().default([]),
  leadStaffId: objectId.optional(),
  serviceIds: z.array(objectId).max(100).optional().default([]),
  isActive: z.boolean().optional().default(true),
});

export const updateCrewSchema = createCrewSchema.partial().extend({
  leadStaffId: objectId.nullable().optional(),
});

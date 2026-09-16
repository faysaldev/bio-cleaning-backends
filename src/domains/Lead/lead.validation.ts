import { z } from "zod";
import { LEAD_ACTIVITY_TYPES, } from "./leadActivity.model";
import { LEAD_SOURCES, LEAD_STATUSES } from "./lead.model";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const optionalObjectId = objectId.optional().or(z.literal(""));
const optionalEmail = z.string().trim().toLowerCase().email().max(254).optional().or(z.literal(""));
const optionalDate = z.string().datetime({ offset: true }).optional().or(z.literal(""));

const leadBaseSchema = z.object({
    name: z.string().trim().min(1).max(160),
    email: optionalEmail,
    phone: z.string().trim().max(50).optional(),
    source: z.enum(LEAD_SOURCES).default("MANUAL"),
    status: z.enum(LEAD_STATUSES).optional().default("NEW"),
    ownerId: optionalObjectId,
    value: z.number().min(0).max(100_000_000).optional().default(0),
    requestedServiceId: optionalObjectId,
    requestedServiceName: z.string().trim().max(160).optional(),
    message: z.string().trim().max(5000).optional(),
    notes: z.string().trim().max(5000).optional(),
    tags: z.array(z.string().trim().min(1).max(80)).max(50).optional().default([]),
    nextFollowUpAt: optionalDate,
    referral: z
      .object({
        referredBy: z.string().trim().max(200).optional(),
        details: z.string().trim().max(1000).optional(),
      })
      .optional(),
  });

export const createLeadSchema = leadBaseSchema.refine(
  (value) => Boolean(value.email || value.phone),
  "Lead email or phone is required",
);

export const publicCaptureLeadSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    email: optionalEmail,
    phone: z.string().trim().max(50).optional(),
    source: z.enum(["GET_QUOTE", "REFERRAL"] as const).default("GET_QUOTE"),
    requestedServiceId: optionalObjectId,
    requestedServiceName: z.string().trim().max(160).optional(),
    value: z.number().min(0).max(100_000_000).optional().default(0),
    message: z.string().trim().max(5000).optional(),
    referral: z
      .object({ referredBy: z.string().trim().max(200).optional(), details: z.string().trim().max(1000).optional() })
      .optional(),
  })
  .refine((value) => Boolean(value.email || value.phone), "Email or phone is required");

export const updateLeadSchema = leadBaseSchema.partial().extend({
  lostReason: z.string().trim().max(1000).optional(),
});

export const createLeadActivitySchema = z.object({
  type: z.enum(LEAD_ACTIVITY_TYPES),
  title: z.string().trim().min(1).max(240),
  body: z.string().trim().max(10000).optional(),
  direction: z.enum(["INBOUND", "OUTBOUND", "INTERNAL"]).optional().default("INTERNAL"),
  occurredAt: z.string().datetime({ offset: true }).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/, "Use YYYY-MM-DDTHH:mm");

export const createLeadTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(240),
    description: z.string().trim().max(3000).optional(),
    dueAt: z.string().datetime({ offset: true }).optional(),
    dueLocal: localDateTime.optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().default("MEDIUM"),
    assignedTo: optionalObjectId,
  })
  .refine((value) => Boolean(value.dueAt || value.dueLocal), "Follow-up due time is required");

export const updateLeadTaskSchema = z.object({
  title: z.string().trim().min(1).max(240).optional(),
  description: z.string().trim().max(3000).optional(),
  dueAt: z.string().datetime({ offset: true }).optional(),
  dueLocal: localDateTime.optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  assignedTo: optionalObjectId,
  status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]).optional(),
});

export const convertLeadSchema = z.object({
  customer: z
    .object({
      name: z.string().trim().min(1).max(160).optional(),
      email: optionalEmail,
      phone: z.string().trim().max(50).optional(),
      address: z
        .object({
          label: z.string().trim().max(80).optional(),
          line1: z.string().trim().min(1).max(200),
          line2: z.string().trim().max(200).optional(),
          city: z.string().trim().min(1).max(100),
          state: z.string().trim().max(100).optional(),
          zip: z.string().trim().min(1).max(30),
          country: z.string().trim().max(100).optional(),
          propertyType: z.enum(["HOME", "OFFICE", "OTHER"]).optional(),
        })
        .optional(),
    })
    .optional(),
});

const importLeadRowSchema = leadBaseSchema
  .omit({ status: true, source: true, nextFollowUpAt: true })
  .extend({ source: z.literal("IMPORT").optional().default("IMPORT") })
  .refine((value) => Boolean(value.email || value.phone), "Lead email or phone is required");

export const importLeadsSchema = z.object({
  leads: z.array(importLeadRowSchema).min(1).max(500),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type PublicCaptureLeadInput = z.infer<typeof publicCaptureLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type CreateLeadActivityInput = z.infer<typeof createLeadActivitySchema>;
export type CreateLeadTaskInput = z.infer<typeof createLeadTaskSchema>;
export type UpdateLeadTaskInput = z.infer<typeof updateLeadTaskSchema>;

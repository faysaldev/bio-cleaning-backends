import { z } from "zod";

export const requestPortalLinkSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

export const exchangePortalLinkSchema = z.object({
  token: z.string().trim().min(32).max(300),
});

export const portalProfileSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  phone: z.string().trim().max(50).optional(),
  addresses: z.array(z.object({
    label: z.string().trim().max(80).optional(),
    line1: z.string().trim().min(1).max(200),
    line2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().max(100).optional(),
    zip: z.string().trim().min(1).max(30),
    country: z.string().trim().max(100).optional(),
    propertyType: z.enum(["HOME", "OFFICE", "OTHER"]).optional(),
    isPrimary: z.boolean().optional(),
  })).max(20).optional(),
  preferences: z.object({
    contactMethod: z.enum(["EMAIL", "PHONE", "SMS"]).optional(),
    preferredContactWindow: z.string().trim().max(120).optional(),
    serviceNotes: z.string().trim().max(3000).optional(),
  }).optional(),
  accessInstructions: z.string().trim().max(3000).optional(),
  pets: z.array(z.object({
    name: z.string().trim().max(100).optional(),
    type: z.string().trim().min(1).max(100),
    notes: z.string().trim().max(1000).optional(),
  })).max(20).optional(),
});

export const portalCancelSchema = z.object({ reason: z.string().trim().max(1000).optional() });
export const portalRescheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlot: z.string().regex(/^\d{2}:\d{2}$/),
});

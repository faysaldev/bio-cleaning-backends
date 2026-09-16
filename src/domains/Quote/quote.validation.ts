import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const address = z.object({
  line1: z.string().trim().min(1).max(200), line2: z.string().trim().max(200).optional(), city: z.string().trim().min(1).max(100),
  state: z.string().trim().max(100).optional(), zip: z.string().trim().min(1).max(30), country: z.string().trim().max(100).optional(),
});
const property = z.object({ propertyType: z.enum(["HOME","OFFICE","OTHER"]).default("HOME"), bedrooms: z.number().min(0).max(30).optional(), bathrooms: z.number().min(0).max(30).optional(), squareFeet: z.number().min(0).max(1_000_000).optional() });

export const createQuoteSchema = z.object({
  leadId: objectId.optional(), customerId: objectId.optional(), serviceId: objectId,
  customer: z.object({ name: z.string().trim().min(1).max(160), email: z.string().trim().toLowerCase().email().max(254), phone: z.string().trim().min(1).max(50), address }),
  bookingDraft: z.object({ propertySize: z.string().trim().max(120).optional(), property, frequency: z.enum(["ONE_TIME","WEEKLY","BI_WEEKLY","MONTHLY"]).default("ONE_TIME"), extraCodes: z.array(z.string().trim().min(1).max(100)).max(50).default([]), promoCode: z.string().trim().max(80).optional(), occurrenceCount: z.number().int().min(1).max(52).default(1) }),
  discount: z.object({ type: z.enum(["PERCENT","FIXED"]), value: z.number().min(0).max(100_000_000), label: z.string().trim().max(120).optional() }).optional(),
  terms: z.array(z.string().trim().min(1).max(1000)).max(20).default([]), notes: z.string().trim().max(5000).optional(), expiresInDays: z.number().int().min(1).max(90).default(14),
});
export const updateQuoteSchema = z.object({ terms: z.array(z.string().trim().min(1).max(1000)).max(20).optional(), notes: z.string().trim().max(5000).optional(), expiresAt: z.string().datetime({ offset: true }).optional() });
export const publicAcceptQuoteSchema = z.object({ name: z.string().trim().min(1).max(160), email: z.string().trim().toLowerCase().email().max(254), agreed: z.literal(true) });
export const publicConvertQuoteSchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), timeSlot: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), paymentOption: z.enum(["PAY_LATER","DEPOSIT"]).default("PAY_LATER") });
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;

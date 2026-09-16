import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid service id");
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must use HH:mm format");
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "Invalid date");

const customerAddressSchema = z.object({
  line1: z.string().trim().min(1, "Address line 1 is required").max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1, "City is required").max(100),
  zip: z.string().trim().min(1, "Zip code is required").max(20),
});

const customerDetailsSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required").max(120),
  email: z.string().trim().toLowerCase().email("Invalid email address").max(254),
  phone: z.string().trim().min(5, "Phone number is required").max(40),
  address: customerAddressSchema,
});

const propertySchema = z.object({
  propertyType: z.enum(["HOME", "OFFICE", "OTHER"]).default("HOME"),
  bedrooms: z.number().int().min(0).max(30).optional(),
  bathrooms: z.number().min(0).max(30).optional(),
  squareFeet: z.number().int().min(1).max(1_000_000).optional(),
});

const pricingRequestShape = {
  serviceId: objectId,
  property: propertySchema.optional().default({ propertyType: "HOME" as const }),
  // Compatibility field for existing clients and old service rules.
  propertySize: z.string().trim().min(1).max(40).optional(),
  frequency: z.enum(["ONE_TIME", "WEEKLY", "BI_WEEKLY", "MONTHLY"]),
  extraCodes: z
    .array(z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()))
    .max(20)
    .optional()
    .default([]),
  promoCode: z
    .string()
    .trim()
    .max(40)
    .transform((value) => value.toUpperCase())
    .optional(),
};

export const bookingQuoteSchema = z.object(pricingRequestShape);

export const availabilitySchema = z.object({
  ...pricingRequestShape,
  date: dateOnly,
});

export const createBookingSchema = z.object({
  ...pricingRequestShape,
  date: dateOnly,
  timeSlot: hhmm,
  occurrenceCount: z.number().int().min(1).max(52).optional().default(1),
  customerDetails: customerDetailsSchema,
  notes: z.string().trim().max(3000).optional(),
  paymentOption: z.enum(["PAY_LATER", "DEPOSIT"]).optional().default("PAY_LATER"),
  bookingSessionId: z.string().uuid().optional(),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]),
});

export const waitlistSchema = z.object({
  serviceId: objectId,
  requestedDate: dateOnly,
  preferredTime: hhmm.optional(),
  frequency: z.enum(["ONE_TIME", "WEEKLY", "BI_WEEKLY", "MONTHLY"]).optional().default("ONE_TIME"),
  property: propertySchema.optional().default({ propertyType: "HOME" as const }),
  extraCodes: z.array(z.string().trim().min(1).max(40)).max(20).optional().default([]),
  customer: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().toLowerCase().email().max(254),
    phone: z.string().trim().min(5).max(40),
  }),
});

export const abandonmentSchema = z.object({
  sessionId: z.string().uuid(),
  state: z.enum(["ACTIVE", "ABANDONED"]).optional().default("ACTIVE"),
  stage: z.string().trim().min(1).max(80),
  serviceId: objectId.optional(),
  property: propertySchema.optional(),
  extraCodes: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  frequency: z.enum(["ONE_TIME", "WEEKLY", "BI_WEEKLY", "MONTHLY"]).optional(),
  requestedDate: dateOnly.optional(),
  requestedTime: hhmm.optional(),
  customer: z
    .object({
      name: z.string().trim().max(120).optional(),
      email: z.string().trim().toLowerCase().email().max(254).optional().or(z.literal("")),
      phone: z.string().trim().max(40).optional(),
    })
    .optional(),
});

export const manageLookupSchema = z.object({
  reference: z.string().trim().min(6).max(80),
  manageToken: z.string().min(32).max(200),
});

export const publicCancelSchema = manageLookupSchema.extend({
  reason: z.string().trim().max(500).optional(),
});

export const publicRescheduleSchema = manageLookupSchema.extend({
  date: dateOnly,
  timeSlot: hhmm,
});

export type BookingQuoteInput = z.infer<typeof bookingQuoteSchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
export type WaitlistInput = z.infer<typeof waitlistSchema>;
export type AbandonmentInput = z.infer<typeof abandonmentSchema>;
export type ManageLookupInput = z.infer<typeof manageLookupSchema>;
export type PublicCancelInput = z.infer<typeof publicCancelSchema>;
export type PublicRescheduleInput = z.infer<typeof publicRescheduleSchema>;

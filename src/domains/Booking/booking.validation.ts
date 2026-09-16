import { z } from "zod";

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid service id");

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

const pricingRequestShape = {
  serviceId: objectId,
  propertySize: z.string().trim().min(1, "Property size is required").max(40),
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

export const createBookingSchema = z.object({
  ...pricingRequestShape,
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format")
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), "Invalid date"),
  timeSlot: z.string().trim().min(1, "Time slot is required").max(80),
  customerDetails: customerDetailsSchema,
  notes: z.string().trim().max(3000).optional(),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]),
});

export type BookingQuoteInput = z.infer<typeof bookingQuoteSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;

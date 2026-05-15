import { z } from "zod";

const customerAddressSchema = z.object({
  line1: z.string().min(1, "Address line 1 is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  zip: z.string().min(1, "Zip code is required"),
});

const customerDetailsSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  address: customerAddressSchema,
});

export const createBookingSchema = z.object({
  serviceType: z.enum(["RESIDENTIAL", "COMMERCIAL", "DEEP_CLEAN", "MOVE_IN_OUT"]),
  propertySize: z.string().min(1, "Property size is required"),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date format"),
  timeSlot: z.string().min(1, "Time slot is required"),
  frequency: z.enum(["ONE_TIME", "WEEKLY", "BI_WEEKLY", "MONTHLY"]),
  customerDetails: customerDetailsSchema,
  notes: z.string().optional(),
  totalAmount: z.number().min(0, "Total amount must be positive"),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;

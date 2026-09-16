import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const optionalEmail = z.string().trim().toLowerCase().email().max(254).optional().or(z.literal(""));

const addressSchema = z.object({
  label: z.string().trim().max(80).optional(),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().max(100).optional(),
  zip: z.string().trim().min(1).max(30),
  country: z.string().trim().max(100).optional(),
  propertyType: z.enum(["HOME", "OFFICE", "OTHER"]).optional(),
  isPrimary: z.boolean().optional().default(false),
});

const customerBaseSchema = z.object({
    name: z.string().trim().min(1).max(160),
    email: optionalEmail,
    phone: z.string().trim().max(50).optional(),
    addresses: z.array(addressSchema).max(20).optional().default([]),
    preferences: z
      .object({
        contactMethod: z.enum(["EMAIL", "PHONE", "SMS"]).optional().default("EMAIL"),
        preferredContactWindow: z.string().trim().max(120).optional(),
        serviceNotes: z.string().trim().max(3000).optional(),
      })
      .optional(),
    accessInstructions: z.string().trim().max(3000).optional(),
    pets: z
      .array(
        z.object({
          name: z.string().trim().max(100).optional(),
          type: z.string().trim().min(1).max(100),
          notes: z.string().trim().max(1000).optional(),
        }),
      )
      .max(20)
      .optional()
      .default([]),
    tags: z.array(z.string().trim().min(1).max(80)).max(50).optional().default([]),
    createdSource: z.string().trim().max(80).optional(),
  });

export const createCustomerSchema = customerBaseSchema.refine(
  (value) => Boolean(value.email || value.phone),
  "Customer email or phone is required",
);

export const updateCustomerSchema = customerBaseSchema.partial().extend({
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export const addCustomerNoteSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});

export const addCustomerReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().trim().max(5000).optional(),
  source: z.string().trim().max(120).optional(),
  bookingReference: z.string().trim().max(100).optional(),
});

export const customerIdSchema = z.object({ id: objectId });

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

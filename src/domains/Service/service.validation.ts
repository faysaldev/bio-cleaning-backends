import { z } from "zod";

const propertyAdjustmentSchema = z.object({
  key: z.string().trim().min(1).max(40),
  amount: z.number().finite(),
});

const frequencyDiscountSchema = z.object({
  frequency: z.enum(["ONE_TIME", "WEEKLY", "BI_WEEKLY", "MONTHLY"]),
  percent: z.number().min(0).max(100),
});

const extraSchema = z.object({
  code: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1).max(100),
  price: z.number().min(0),
  isActive: z.boolean().optional().default(true),
});

const promotionSchema = z.object({
  code: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().min(0),
  isActive: z.boolean().optional().default(true),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});

const pricingSchema = z.object({
  minimumPrice: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  propertySizeAdjustments: z.array(propertyAdjustmentSchema).max(30).optional(),
  frequencyDiscounts: z.array(frequencyDiscountSchema).max(10).optional(),
  extras: z.array(extraSchema).max(50).optional(),
  promotions: z.array(promotionSchema).max(50).optional(),
});

const serviceShape = {
  name: z.string().trim().min(1, "Service name is required").max(120),
  description: z.string().trim().min(1, "Description is required").max(5000),
  basePrice: z.number().min(0, "Base price must be positive"),
  includes: z.array(z.string().trim().min(1).max(300)).max(100),
  image: z.string().url("Invalid image URL"),
  duration: z.string().trim().min(1, "Duration is required").max(100),
  tags: z.array(z.string().trim().min(1).max(80)).max(30),
  isActive: z.boolean().optional(),
  // Accepted only as a migration alias; transformed into isActive below.
  publish: z.boolean().optional(),
  pricing: pricingSchema.optional(),
};

const normalizePublish = <T extends { isActive?: boolean; publish?: boolean }>(value: T) => {
  const { publish, ...rest } = value;
  return {
    ...rest,
    ...(rest.isActive === undefined && publish !== undefined ? { isActive: publish } : {}),
  };
};

export const createServiceSchema = z.object(serviceShape).transform(normalizePublish);
export const updateServiceSchema = z.object(serviceShape).partial().transform(normalizePublish);

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

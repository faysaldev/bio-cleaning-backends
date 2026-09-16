import { z } from "zod";

const propertyAdjustmentSchema = z.object({
  key: z.string().trim().min(1).max(40),
  amount: z.number().finite(),
});

const frequencyDiscountSchema = z.object({
  frequency: z.enum(["ONE_TIME", "WEEKLY", "BI_WEEKLY", "MONTHLY"]),
  percent: z.number().min(0).max(100),
});

const squareFootageTierSchema = z
  .object({
    minSqFt: z.number().min(0),
    maxSqFt: z.number().min(0).optional(),
    priceAdjustment: z.number().finite().default(0),
    durationAdjustmentMinutes: z.number().int().min(0).max(1440).default(0),
  })
  .refine((value) => value.maxSqFt === undefined || value.maxSqFt >= value.minSqFt, {
    message: "maxSqFt must be greater than or equal to minSqFt",
    path: ["maxSqFt"],
  });

const extraSchema = z.object({
  code: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  price: z.number().min(0),
  durationMinutes: z.number().int().min(0).max(720).optional().default(0),
  additionalStaff: z.number().int().min(0).max(20).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

const promotionSchema = z
  .object({
    code: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
    type: z.enum(["PERCENT", "FIXED"]),
    value: z.number().min(0),
    isActive: z.boolean().optional().default(true),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    maxRedemptions: z.number().int().min(1).optional(),
    redemptionCount: z.number().int().min(0).optional(),
  })
  .refine((value) => !value.startsAt || !value.endsAt || value.endsAt >= value.startsAt, {
    message: "Promotion end date must be after its start date",
    path: ["endsAt"],
  });

const pricingSchema = z.object({
  minimumPrice: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  propertyPricingMode: z.enum(["FIXED", "BED_BATH", "SQUARE_FOOTAGE"]).optional(),
  includedBedrooms: z.number().int().min(0).max(30).optional(),
  includedBathrooms: z.number().int().min(0).max(30).optional(),
  additionalBedroomPrice: z.number().min(0).optional(),
  additionalBathroomPrice: z.number().min(0).optional(),
  additionalBedroomMinutes: z.number().int().min(0).max(720).optional(),
  additionalBathroomMinutes: z.number().int().min(0).max(720).optional(),
  squareFootageTiers: z.array(squareFootageTierSchema).max(30).optional(),
  propertySizeAdjustments: z.array(propertyAdjustmentSchema).max(30).optional(),
  frequencyDiscounts: z.array(frequencyDiscountSchema).max(10).optional(),
  extras: z.array(extraSchema).max(50).optional(),
  promotions: z.array(promotionSchema).max(50).optional(),
});

const schedulingSchema = z.object({
  durationMinutes: z.number().int().min(15).max(1440).optional(),
  requiredStaff: z.number().int().min(1).max(20).optional(),
  bufferBeforeMinutes: z.number().int().min(0).max(240).optional(),
  bufferAfterMinutes: z.number().int().min(0).max(240).optional(),
  preparationInstructions: z.array(z.string().trim().min(1).max(500)).max(40).optional(),
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
  publish: z.boolean().optional(),
  pricing: pricingSchema.optional(),
  scheduling: schedulingSchema.optional(),
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

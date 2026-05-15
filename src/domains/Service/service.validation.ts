import { z } from "zod";

export const createServiceSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  description: z.string().min(1, "Description is required"),
  basePrice: z.number().min(0, "Base price must be positive"),
  includes: z.array(z.string()),
  image: z.string().url("Invalid image URL"),
  duration: z.string().min(1, "Duration is required"),
  tags: z.array(z.string()),
  publish: z.boolean().optional(),
});

export const updateServiceSchema = createServiceSchema.partial();

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

import { z } from "zod";

export const submitReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(5000).optional(),
  publishConsent: z.boolean().optional().default(false),
});

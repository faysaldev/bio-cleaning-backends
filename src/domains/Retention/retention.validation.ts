import { z } from "zod";
export const updateRetentionSettingsSchema = z.object({
  bookingRemindersEnabled: z.boolean().optional(),
  reminderHoursBefore: z.array(z.number().int().min(1).max(336)).min(1).max(5).optional(),
  reviewRequestsEnabled: z.boolean().optional(),
  reviewDelayMinutes: z.number().int().min(0).max(10080).optional(),
  reviewLinkDays: z.number().int().min(1).max(365).optional(),
  publicReviewThreshold: z.number().int().min(1).max(5).optional(),
  publicReviewUrl: z.string().trim().url().max(1200).optional().or(z.literal("")),
  rebookRemindersEnabled: z.boolean().optional(),
  rebookReminderDays: z.number().int().min(1).max(365).optional(),
  winBackEnabled: z.boolean().optional(),
  inactiveCustomerDays: z.number().int().min(7).max(1095).optional(),
  smsEnabled: z.boolean().optional(),
});

import { z } from "zod";

export const createContactSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(120),
  email: z.string().trim().toLowerCase().email("Invalid email address").max(254),
  phone: z.string().trim().min(5, "Phone number is required").max(40),
  service: z.string().trim().min(1, "Service interest is required").max(120),
  message: z.string().trim().min(1, "Message is required").max(3000),
  leadSource: z.enum(["CONTACT", "CAREERS"] as const).optional().default("CONTACT"),
});

export const replyContactSchema = z.object({
  reply: z.string().trim().min(1, "Reply message is required").max(5000),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type ReplyContactInput = z.infer<typeof replyContactSchema>;

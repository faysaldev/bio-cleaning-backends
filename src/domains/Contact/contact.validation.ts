import { z } from "zod";

export const createContactSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  service: z.string().min(1, "Service interest is required"),
  message: z.string().min(1, "Message is required"),
});

export const replyContactSchema = z.object({
  reply: z.string().min(1, "Reply message is required"),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type ReplyContactInput = z.infer<typeof replyContactSchema>;

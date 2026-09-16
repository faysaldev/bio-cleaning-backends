import { z } from "zod";

const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long");

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Invalid email address").max(254),
  password: strongPassword,
  role: z.enum(["owner", "admin", "manager", "dispatcher", "cleaner", "support", "read_only", "user"]).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  image: z.string().url().max(2048).optional(),
  dateOfBirth: z.string().date().optional(),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1).max(128),
  newPassword: strongPassword,
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

export const resetPasswordSchema = z.object({
  password: strongPassword,
});

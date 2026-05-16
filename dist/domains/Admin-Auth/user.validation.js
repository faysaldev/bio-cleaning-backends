"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.changePasswordSchema = exports.updateUserSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
exports.createUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required"),
    email: zod_1.z.string().email("Invalid email address"),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
    role: zod_1.z.enum(["admin", "user"]).optional(),
});
exports.updateUserSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional(),
    image: zod_1.z.string().optional(),
    dateOfBirth: zod_1.z.string().optional(),
});
exports.changePasswordSchema = zod_1.z.object({
    oldPassword: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(6),
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
exports.resetPasswordSchema = zod_1.z.object({
    password: zod_1.z.string().min(6),
});

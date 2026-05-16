"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordSchema = exports.registerSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email address"),
    password: zod_1.z.string().min(8, "Password must be at least 8 characters"),
});
exports.registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(3, "Name must be at least 3 characters"),
    email: zod_1.z.string().email("Invalid email address"),
    password: zod_1.z.string().min(8, "Password must be at least 8 characters"),
    role: zod_1.z.enum(["admin", "user"]).default("user").optional(),
    image: zod_1.z.string().optional(),
});
exports.changePasswordSchema = zod_1.z.object({
    oldPassword: zod_1.z.string().min(1, "Old password is required"),
    newPassword: zod_1.z.string().min(8, "New password must be at least 8 characters"),
});

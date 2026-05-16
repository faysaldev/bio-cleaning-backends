"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replyContactSchema = exports.createContactSchema = void 0;
const zod_1 = require("zod");
exports.createContactSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(1, "Full name is required"),
    email: zod_1.z.string().email("Invalid email address"),
    phone: zod_1.z.string().min(1, "Phone number is required"),
    service: zod_1.z.string().min(1, "Service interest is required"),
    message: zod_1.z.string().min(1, "Message is required"),
});
exports.replyContactSchema = zod_1.z.object({
    reply: zod_1.z.string().min(1, "Reply message is required"),
});

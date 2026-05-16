"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBookingStatusSchema = exports.createBookingSchema = void 0;
const zod_1 = require("zod");
const customerAddressSchema = zod_1.z.object({
    line1: zod_1.z.string().min(1, "Address line 1 is required"),
    line2: zod_1.z.string().optional(),
    city: zod_1.z.string().min(1, "City is required"),
    zip: zod_1.z.string().min(1, "Zip code is required"),
});
const customerDetailsSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Customer name is required"),
    email: zod_1.z.string().email("Invalid email address"),
    phone: zod_1.z.string().min(1, "Phone number is required"),
    address: customerAddressSchema,
});
exports.createBookingSchema = zod_1.z.object({
    serviceType: zod_1.z.enum(["RESIDENTIAL", "COMMERCIAL", "DEEP_CLEAN", "MOVE_IN_OUT"]),
    propertySize: zod_1.z.string().min(1, "Property size is required"),
    date: zod_1.z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date format"),
    timeSlot: zod_1.z.string().min(1, "Time slot is required"),
    frequency: zod_1.z.enum(["ONE_TIME", "WEEKLY", "BI_WEEKLY", "MONTHLY"]),
    customerDetails: customerDetailsSchema,
    notes: zod_1.z.string().optional(),
    totalAmount: zod_1.z.number().min(0, "Total amount must be positive"),
});
exports.updateBookingStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]),
});

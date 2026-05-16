"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateServiceSchema = exports.createServiceSchema = void 0;
const zod_1 = require("zod");
exports.createServiceSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Service name is required"),
    description: zod_1.z.string().min(1, "Description is required"),
    basePrice: zod_1.z.number().min(0, "Base price must be positive"),
    includes: zod_1.z.array(zod_1.z.string()),
    image: zod_1.z.string().url("Invalid image URL"),
    duration: zod_1.z.string().min(1, "Duration is required"),
    tags: zod_1.z.array(zod_1.z.string()),
    publish: zod_1.z.boolean().optional(),
});
exports.updateServiceSchema = exports.createServiceSchema.partial();

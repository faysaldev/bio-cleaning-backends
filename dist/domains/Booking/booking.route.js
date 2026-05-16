"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const booking_controller_1 = __importDefault(require("./booking.controller"));
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const isAdmin_middleware_1 = require("../../middlewares/isAdmin.middleware");
const validation_middleware_1 = require("../../middlewares/validation.middleware");
const booking_validation_1 = require("./booking.validation");
const router = (0, express_1.Router)();
// Public routes
router.post("/", (0, validation_middleware_1.validate)(booking_validation_1.createBookingSchema), booking_controller_1.default.createBooking);
router.get("/booked-slots", booking_controller_1.default.getBookedSlots);
// Admin routes
router.get("/", auth_middleware_1.authMiddleware, isAdmin_middleware_1.isAdmin, booking_controller_1.default.getAllBookings);
router.get("/:id", auth_middleware_1.authMiddleware, isAdmin_middleware_1.isAdmin, booking_controller_1.default.getBookingById);
router.patch("/:id/status", auth_middleware_1.authMiddleware, isAdmin_middleware_1.isAdmin, (0, validation_middleware_1.validate)(booking_validation_1.updateBookingStatusSchema), booking_controller_1.default.updateBookingStatus);
exports.default = router;

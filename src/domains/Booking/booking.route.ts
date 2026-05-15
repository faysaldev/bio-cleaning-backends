import { Router } from "express";
import bookingController from "./booking.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { isAdmin } from "../../middlewares/isAdmin.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { createBookingSchema, updateBookingStatusSchema } from "./booking.validation";

const router = Router();

// Public routes
router.post("/", validate(createBookingSchema), bookingController.createBooking);
router.get("/booked-slots", bookingController.getBookedSlots);

// Admin routes
router.get("/", authMiddleware, isAdmin, bookingController.getAllBookings);
router.get("/:id", authMiddleware, isAdmin, bookingController.getBookingById);
router.patch("/:id/status", authMiddleware, isAdmin, validate(updateBookingStatusSchema), bookingController.updateBookingStatus);

export default router;

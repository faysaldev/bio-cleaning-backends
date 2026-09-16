import { Router } from "express";
import bookingController from "./booking.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { isAdmin } from "../../middlewares/isAdmin.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  bookingQuoteSchema,
  createBookingSchema,
  updateBookingStatusSchema,
} from "./booking.validation";
import {
  availabilityRateLimiter,
  bookingQuoteRateLimiter,
  bookingRateLimiter,
} from "../../middlewares/rateLimit.middleware";

const router = Router();

router.post(
  "/quote",
  bookingQuoteRateLimiter,
  validate(bookingQuoteSchema),
  bookingController.getQuote,
);
router.post(
  "/",
  bookingRateLimiter,
  validate(createBookingSchema),
  bookingController.createBooking,
);
router.get(
  "/booked-slots",
  availabilityRateLimiter,
  bookingController.getBookedSlots,
);

router.get("/", authMiddleware, isAdmin, bookingController.getAllBookings);
router.get("/:id", authMiddleware, isAdmin, bookingController.getBookingById);
router.patch(
  "/:id/status",
  authMiddleware,
  isAdmin,
  validate(updateBookingStatusSchema),
  bookingController.updateBookingStatus,
);

export default router;

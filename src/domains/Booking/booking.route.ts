import { Router } from "express";
import bookingController from "./booking.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { isAdmin } from "../../middlewares/isAdmin.middleware";
import { requireRoles } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  abandonmentSchema,
  availabilitySchema,
  bookingQuoteSchema,
  createBookingSchema,
  manageLookupSchema,
  publicCancelSchema,
  publicRescheduleSchema,
  updateBookingStatusSchema,
  waitlistSchema,
} from "./booking.validation";
import {
  availabilityRateLimiter,
  bookingQuoteRateLimiter,
  bookingRateLimiter,
} from "../../middlewares/rateLimit.middleware";

const router = Router();

router.post("/quote", bookingQuoteRateLimiter, validate(bookingQuoteSchema), bookingController.getQuote);
router.post("/availability", availabilityRateLimiter, validate(availabilitySchema), bookingController.getAvailability);
router.post("/waitlist", bookingRateLimiter, validate(waitlistSchema), bookingController.joinWaitlist);
router.post("/abandonment", bookingRateLimiter, validate(abandonmentSchema), bookingController.captureAbandonment);
router.post("/manage/lookup", bookingRateLimiter, validate(manageLookupSchema), bookingController.getManagedBooking);
router.post("/manage/cancel", bookingRateLimiter, validate(publicCancelSchema), bookingController.cancelManagedBooking);
router.post("/manage/reschedule", bookingRateLimiter, validate(publicRescheduleSchema), bookingController.rescheduleManagedBooking);
router.post("/manage/payment", bookingRateLimiter, validate(manageLookupSchema), bookingController.startManagedPayment);
router.post("/admin", authMiddleware, requireRoles("owner", "admin", "manager", "dispatcher"), validate(createBookingSchema), bookingController.createAdminBooking);
router.post("/", bookingRateLimiter, validate(createBookingSchema), bookingController.createBooking);

// Retained for compatibility with older clients; the Phase 3 UI uses /availability.
router.get("/booked-slots", availabilityRateLimiter, bookingController.getBookedSlots);

router.get("/admin/waitlist", authMiddleware, isAdmin, bookingController.getAdminWaitlist);
router.get("/admin/abandoned", authMiddleware, isAdmin, bookingController.getAdminAbandonedBookings);
router.get("/", authMiddleware, isAdmin, bookingController.getAllBookings);
router.get("/:id", authMiddleware, isAdmin, bookingController.getBookingById);
router.patch(
  "/:id/status",
  authMiddleware,
  requireRoles("owner", "admin", "manager", "dispatcher"),
  validate(updateBookingStatusSchema),
  bookingController.updateBookingStatus,
);

export default router;

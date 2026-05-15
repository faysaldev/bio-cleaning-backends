import { Router } from "express";

// Domain routes
import authRoutes from "../domains/Auth/auth.route";
import userRoutes from "../domains/Admin-Auth/user.route";
import bookingRoutes from "../domains/Booking/booking.route";
import contactRoutes from "../domains/Contact/contact.route";
import serviceRoutes from "../domains/Service/service.route";
import dashboardRoutes from "../domains/Dashboard/dashboard.route";
import assetRoutes from "../domains/Asset/asset.route";

// Initialize the router
const router = Router();

// Auth routes
router.use("/auth", authRoutes);

// User management routes
router.use("/users", userRoutes);

// Business domains
router.use("/bookings", bookingRoutes);
router.use("/contact", contactRoutes);
router.use("/services", serviceRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/assets", assetRoutes);

export default router;

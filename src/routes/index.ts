import { Router } from "express";

// Domain routes
import userRoutes from "../domains/Admin-Auth/user.route";
import authRoutes from "../domains/Auth/auth.route";
import doctorRoutes from "../domains/Doctor/doctor.route";
import serviceRoutes from "../domains/Service/service.route";
import blogRoutes from "../domains/Blog/blog.route";
import appointmentRoutes from "../domains/Appointment/appointment.route";
import contactRoutes from "../domains/Contact/contact.route";
import testimonialRoutes from "../domains/Testimonial/testimonial.route";
import settingRoutes from "../domains/Setting/setting.route";
import assetRoutes from "../domains/Asset/asset.route";
import dashboardRoutes from "../domains/Dashboard/dashboard.route";
import activityLogRoutes from "../domains/ActivityLog/activity-log.route";

// Initialize the router
const router = Router();

// Auth routes
router.use("/auth", authRoutes);

// User management routes
router.use("/users", userRoutes);

// Business domains
router.use("/doctors", doctorRoutes);
router.use("/services", serviceRoutes);
router.use("/blog", blogRoutes);
router.use("/appointments", appointmentRoutes);
router.use("/contact", contactRoutes);
router.use("/testimonials", testimonialRoutes);
router.use("/settings", settingRoutes);
router.use("/assets", assetRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/activity-logs", activityLogRoutes);

export default router;



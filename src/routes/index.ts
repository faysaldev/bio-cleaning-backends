import { Router } from "express";

// Domain routes
import authRoutes from "../domains/Auth/auth.route";
import userRoutes from "../domains/Admin-Auth/user.route";
import bookingRoutes from "../domains/Booking/booking.route";
import contactRoutes from "../domains/Contact/contact.route";
import serviceRoutes from "../domains/Service/service.route";
import dashboardRoutes from "../domains/Dashboard/dashboard.route";
import assetRoutes from "../domains/Asset/asset.route";
import schedulingRoutes from "../domains/Scheduling/scheduling.route";
import leadRoutes from "../domains/Lead/lead.route";
import customerRoutes from "../domains/Customer/customer.route";
import teamRoutes from "../domains/Team/team.route";
import fieldOpsRoutes from "../domains/FieldOps/fieldOps.route";
import quoteRoutes from "../domains/Quote/quote.route";
import invoiceRoutes from "../domains/Invoice/invoice.route";
import paymentRoutes from "../domains/Payment/payment.route";
import portalRoutes from "../domains/Portal/portal.route";
import reviewRoutes from "../domains/Review/review.route";
import retentionRoutes from "../domains/Retention/retention.route";
import websiteRoutes from "../domains/Website/website.route";


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
router.use("/scheduling", schedulingRoutes);
router.use("/leads", leadRoutes);
router.use("/customers", customerRoutes);
router.use("/team", teamRoutes);
router.use("/field-ops", fieldOpsRoutes);
router.use("/quotes", quoteRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/payments", paymentRoutes);
router.use("/portal", portalRoutes);
router.use("/reviews", reviewRoutes);
router.use("/communications", retentionRoutes);
router.use("/website", websiteRoutes);


export default router;

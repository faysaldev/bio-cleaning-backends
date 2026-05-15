import { Router } from "express";
import dashboardController from "./dashboard.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { isAdmin } from "../../middlewares/isAdmin.middleware";

const router = Router();

router.get("/stats", authMiddleware, isAdmin, dashboardController.getStats);
router.get("/recent-bookings", authMiddleware, isAdmin, dashboardController.getRecentBookings);

export default router;

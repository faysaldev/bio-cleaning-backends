import { Router } from "express";
import reviewController from "./review.controller";
import { validate } from "../../middlewares/validation.middleware";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRoles } from "../../middlewares/role.middleware";
import { createRateLimiter } from "../../middlewares/rateLimit.middleware";
import { submitReviewSchema } from "./review.validation";

const router = Router();
router.use((_req, res, next) => { res.setHeader("Cache-Control", "private, no-store"); next(); });
const publicLimiter = createRateLimiter({ namespace: "public-review", windowMs: 15 * 60 * 1000, max: 30 });
router.get("/public/:token", publicLimiter, reviewController.getPublic);
router.post("/public/:token", publicLimiter, validate(submitReviewSchema), reviewController.submitPublic);
router.get("/", authMiddleware, requireRoles("owner", "admin", "manager", "support", "read_only"), reviewController.listAdmin);
router.post("/booking/:bookingId/resend", authMiddleware, requireRoles("owner", "admin", "manager", "support"), reviewController.resend);
export default router;

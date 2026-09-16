import { Router } from "express";
import retentionController from "./retention.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRoles } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { updateRetentionSettingsSchema } from "./retention.validation";

const router = Router();
router.post("/cron", retentionController.cron);
router.use(authMiddleware);
router.get("/summary", requireRoles("owner", "admin", "manager", "support", "read_only"), retentionController.summary);
router.get("/settings", requireRoles("owner", "admin", "manager", "support", "read_only"), retentionController.getSettings);
router.patch("/settings", requireRoles("owner", "admin", "manager"), validate(updateRetentionSettingsSchema), retentionController.updateSettings);
router.get("/deliveries", requireRoles("owner", "admin", "manager", "support", "read_only"), retentionController.deliveries);
router.post("/deliveries/:id/retry", requireRoles("owner", "admin", "manager", "support"), retentionController.retryDelivery);
router.post("/run", requireRoles("owner", "admin", "manager"), retentionController.run);
export default router;

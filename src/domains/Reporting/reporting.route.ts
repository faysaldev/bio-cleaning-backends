import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRoles } from "../../middlewares/role.middleware";
import controller from "./reporting.controller";
const router = Router();
router.get("/", authMiddleware, requireRoles("owner", "admin", "manager", "dispatcher", "support", "read_only"), controller.get);
export default router;

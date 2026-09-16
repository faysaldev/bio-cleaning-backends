import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRoles } from "../../middlewares/role.middleware";
import controller from "./audit.controller";
const router = Router();
router.get("/", authMiddleware, requireRoles("owner", "admin", "manager", "read_only"), controller.list);
export default router;

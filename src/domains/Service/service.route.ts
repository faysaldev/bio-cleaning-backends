import { Router } from "express";
import serviceController from "./service.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { isAdmin } from "../../middlewares/isAdmin.middleware";
import { requireRoles } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { createServiceSchema, updateServiceSchema } from "./service.validation";

const router = Router();
router.get("/admin", authMiddleware, isAdmin, serviceController.getAllServicesAdmin);
router.get("/", serviceController.getAllServices);
router.get("/short-details", serviceController.getShortServices);
router.get("/:id", serviceController.getServiceById);
router.post("/", authMiddleware, requireRoles("owner", "admin", "manager"), validate(createServiceSchema), serviceController.createService);
router.patch("/:id", authMiddleware, requireRoles("owner", "admin", "manager"), validate(updateServiceSchema), serviceController.updateService);
router.delete("/:id", authMiddleware, requireRoles("owner", "admin", "manager"), serviceController.deleteService);
export default router;

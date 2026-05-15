import { Router } from "express";
import serviceController from "./service.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { isAdmin } from "../../middlewares/isAdmin.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { createServiceSchema, updateServiceSchema } from "./service.validation";

const router = Router();

// Public routes
router.get("/", serviceController.getAllServices);
router.get("/short-details", serviceController.getShortServices);
router.get("/:id", serviceController.getServiceById);

// Admin routes
router.post("/", authMiddleware, isAdmin, validate(createServiceSchema), serviceController.createService);
router.patch("/:id", authMiddleware, isAdmin, validate(updateServiceSchema), serviceController.updateService);
router.delete("/:id", authMiddleware, isAdmin, serviceController.deleteService);

export default router;

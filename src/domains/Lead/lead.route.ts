import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { isAdmin } from "../../middlewares/isAdmin.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { leadCaptureRateLimiter } from "../../middlewares/rateLimit.middleware";
import leadController from "./lead.controller";
import {
  convertLeadSchema,
  createLeadActivitySchema,
  createLeadSchema,
  createLeadTaskSchema,
  importLeadsSchema,
  publicCaptureLeadSchema,
  updateLeadSchema,
  updateLeadTaskSchema,
} from "./lead.validation";

const router = Router();

router.post("/public", leadCaptureRateLimiter, validate(publicCaptureLeadSchema), leadController.capturePublicLead);
router.use(authMiddleware, isAdmin);
router.get("/pipeline", leadController.pipeline);
router.get("/board", leadController.board);
router.get("/follow-ups", leadController.followUps);
router.get("/owners", leadController.owners);
router.post("/import", validate(importLeadsSchema), leadController.importLeads);
router.get("/", leadController.listLeads);
router.post("/", validate(createLeadSchema), leadController.createLead);
router.get("/:id", leadController.getLead);
router.patch("/:id", validate(updateLeadSchema), leadController.updateLead);
router.post("/:id/convert", validate(convertLeadSchema), leadController.convertLead);
router.post("/:id/activities", validate(createLeadActivitySchema), leadController.recordActivity);
router.post("/:id/tasks", validate(createLeadTaskSchema), leadController.createTask);
router.patch("/:id/tasks/:taskId", validate(updateLeadTaskSchema), leadController.updateTask);

export default router;

import { Router } from "express";
import schedulingController from "./scheduling.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { isAdmin } from "../../middlewares/isAdmin.middleware";
import { validate } from "../../middlewares/validation.middleware";
import {
  createScheduleBlockSchema,
  createStaffScheduleSchema,
  updateScheduleBlockSchema,
  updateSchedulingSettingsSchema,
  updateStaffScheduleSchema,
} from "./scheduling.validation";

const router = Router();

router.get("/public", schedulingController.getPublicConfig);

router.use(authMiddleware, isAdmin);
router.get("/settings", schedulingController.getSettings);
router.patch("/settings", validate(updateSchedulingSettingsSchema), schedulingController.updateSettings);
router.get("/staff", schedulingController.listStaff);
router.post("/staff", validate(createStaffScheduleSchema), schedulingController.createStaff);
router.patch("/staff/:id", validate(updateStaffScheduleSchema), schedulingController.updateStaff);
router.delete("/staff/:id", schedulingController.deleteStaff);
router.get("/blocks", schedulingController.listBlocks);
router.post("/blocks", validate(createScheduleBlockSchema), schedulingController.createBlock);
router.patch("/blocks/:id", validate(updateScheduleBlockSchema), schedulingController.updateBlock);
router.delete("/blocks/:id", schedulingController.deleteBlock);

export default router;

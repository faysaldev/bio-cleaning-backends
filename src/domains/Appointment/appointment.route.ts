import { Router } from "express";
import appointmentController from "./appointment.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { zodValidate } from "../../middlewares/validations/zod.validations";
import {
  createAppointmentSchema,
  updateAppointmentStatusSchema,
} from "./appointment.validation";

const router = Router();

router.get("/availability", appointmentController.getAvailability);
router.post(
  "/",
  zodValidate(createAppointmentSchema, "body"),
  appointmentController.createAppointment,
);

// Protected Admin routes
router.get("/", authMiddleware, appointmentController.getAllAppointments);
router.put(
  "/:id",
  authMiddleware,
  zodValidate(updateAppointmentStatusSchema, "body"),
  appointmentController.updateStatus,
);

router.delete("/:id", authMiddleware, appointmentController.deleteAppointment);

export default router;

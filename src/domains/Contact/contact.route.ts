import { Router } from "express";
import contactController from "./contact.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { isAdmin } from "../../middlewares/isAdmin.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { createContactSchema, replyContactSchema } from "./contact.validation";

const router = Router();

// Public routes
router.post("/", validate(createContactSchema), contactController.createContact);

// Admin routes
router.get("/", authMiddleware, isAdmin, contactController.getAllContacts);
router.post("/:id/reply", authMiddleware, isAdmin, validate(replyContactSchema), contactController.replyToContact);

export default router;

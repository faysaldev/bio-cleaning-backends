import { Router } from "express";
import contactController from "./contact.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { isAdmin } from "../../middlewares/isAdmin.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { createContactSchema, replyContactSchema } from "./contact.validation";
import { contactRateLimiter } from "../../middlewares/rateLimit.middleware";

const router = Router();

router.post(
  "/",
  contactRateLimiter,
  validate(createContactSchema),
  contactController.createContact,
);

router.get("/", authMiddleware, isAdmin, contactController.getAllContacts);
router.post(
  "/:id/reply",
  authMiddleware,
  isAdmin,
  validate(replyContactSchema),
  contactController.replyToContact,
);

export default router;

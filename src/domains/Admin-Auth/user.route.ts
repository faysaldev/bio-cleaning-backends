import { Router } from "express";
import userController from "./user.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { isAdmin } from "../../middlewares/isAdmin.middleware";
import { validate } from "../../middlewares/validation.middleware";
import { updateUserSchema, changePasswordSchema } from "./user.validation";

const router = Router();

router.get("/profile", authMiddleware, userController.getProfile);
router.patch("/profile", authMiddleware, validate(updateUserSchema), userController.updateProfile);
router.post("/change-password", authMiddleware, validate(changePasswordSchema), userController.changePassword);

// Admin routes
router.get("/", authMiddleware, isAdmin, userController.getAllUsers);

export default router;

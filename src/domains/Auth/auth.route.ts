import { Router } from "express";
import authController from "./auth.controller";
import { zodValidate } from "../../middlewares/validations/zod.validations";
import { loginSchema, registerSchema } from "./auth.validation";

const router = Router();

router.post("/login", zodValidate(loginSchema, "body"), authController.login);
router.post(
  "/register",
  zodValidate(registerSchema, "body"),
  authController.register,
);
router.post("/logout", authController.logout);

export default router;

import { Router } from "express";
import authController from "./auth.controller";
import { validate } from "../../middlewares/validation.middleware";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./auth.validation";
import {
  forgotPasswordRateLimiter,
  loginRateLimiter,
  refreshSessionRateLimiter,
  registerRateLimiter,
  resetPasswordRateLimiter,
} from "../../middlewares/rateLimit.middleware";

const router = Router();

router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  next();
});

router.post("/login", loginRateLimiter, validate(loginSchema), authController.login);
router.post(
  "/register",
  registerRateLimiter,
  validate(registerSchema),
  authController.register,
);
router.post("/refresh", refreshSessionRateLimiter, authController.refresh);
router.get("/session", authMiddleware, authController.session);
router.post(
  "/forgot-password",
  forgotPasswordRateLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
router.post(
  "/reset-password",
  resetPasswordRateLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword,
);
router.post("/logout", authMiddleware, authController.logout);
router.post(
  "/change-password",
  authMiddleware,
  validate(changePasswordSchema),
  authController.changePassword,
);

export default router;

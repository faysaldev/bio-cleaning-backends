"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = __importDefault(require("./auth.controller"));
const validation_middleware_1 = require("../../middlewares/validation.middleware");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const auth_validation_1 = require("./auth.validation");
const router = (0, express_1.Router)();
router.post("/login", (0, validation_middleware_1.validate)(auth_validation_1.loginSchema), auth_controller_1.default.login);
router.post("/register", (0, validation_middleware_1.validate)(auth_validation_1.registerSchema), auth_controller_1.default.register);
router.post("/forgot-password", auth_controller_1.default.forgotPassword);
router.post("/reset-password", auth_controller_1.default.resetPassword);
router.post("/logout", auth_controller_1.default.logout);
router.post("/change-password", auth_middleware_1.authMiddleware, (0, validation_middleware_1.validate)(auth_validation_1.changePasswordSchema), auth_controller_1.default.changePassword);
exports.default = router;

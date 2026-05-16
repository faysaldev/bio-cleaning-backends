"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = __importDefault(require("./user.controller"));
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const isAdmin_middleware_1 = require("../../middlewares/isAdmin.middleware");
const validation_middleware_1 = require("../../middlewares/validation.middleware");
const user_validation_1 = require("./user.validation");
const router = (0, express_1.Router)();
router.get("/profile", auth_middleware_1.authMiddleware, user_controller_1.default.getProfile);
router.patch("/profile", auth_middleware_1.authMiddleware, (0, validation_middleware_1.validate)(user_validation_1.updateUserSchema), user_controller_1.default.updateProfile);
router.post("/change-password", auth_middleware_1.authMiddleware, (0, validation_middleware_1.validate)(user_validation_1.changePasswordSchema), user_controller_1.default.changePassword);
// Admin routes
router.get("/", auth_middleware_1.authMiddleware, isAdmin_middleware_1.isAdmin, user_controller_1.default.getAllUsers);
exports.default = router;

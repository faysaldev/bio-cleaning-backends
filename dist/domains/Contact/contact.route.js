"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contact_controller_1 = __importDefault(require("./contact.controller"));
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const isAdmin_middleware_1 = require("../../middlewares/isAdmin.middleware");
const validation_middleware_1 = require("../../middlewares/validation.middleware");
const contact_validation_1 = require("./contact.validation");
const router = (0, express_1.Router)();
// Public routes
router.post("/", (0, validation_middleware_1.validate)(contact_validation_1.createContactSchema), contact_controller_1.default.createContact);
// Admin routes
router.get("/", auth_middleware_1.authMiddleware, isAdmin_middleware_1.isAdmin, contact_controller_1.default.getAllContacts);
router.post("/:id/reply", auth_middleware_1.authMiddleware, isAdmin_middleware_1.isAdmin, (0, validation_middleware_1.validate)(contact_validation_1.replyContactSchema), contact_controller_1.default.replyToContact);
exports.default = router;

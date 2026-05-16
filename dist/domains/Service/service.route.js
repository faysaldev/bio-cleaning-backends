"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const service_controller_1 = __importDefault(require("./service.controller"));
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const isAdmin_middleware_1 = require("../../middlewares/isAdmin.middleware");
const validation_middleware_1 = require("../../middlewares/validation.middleware");
const service_validation_1 = require("./service.validation");
const router = (0, express_1.Router)();
// Admin routes
router.get("/admin", auth_middleware_1.authMiddleware, isAdmin_middleware_1.isAdmin, service_controller_1.default.getAllServicesAdmin);
// Public routes
router.get("/", service_controller_1.default.getAllServices);
router.get("/short-details", service_controller_1.default.getShortServices);
router.get("/:id", service_controller_1.default.getServiceById);
router.post("/", auth_middleware_1.authMiddleware, isAdmin_middleware_1.isAdmin, (0, validation_middleware_1.validate)(service_validation_1.createServiceSchema), service_controller_1.default.createService);
router.patch("/:id", auth_middleware_1.authMiddleware, isAdmin_middleware_1.isAdmin, (0, validation_middleware_1.validate)(service_validation_1.updateServiceSchema), service_controller_1.default.updateService);
router.delete("/:id", auth_middleware_1.authMiddleware, isAdmin_middleware_1.isAdmin, service_controller_1.default.deleteService);
exports.default = router;

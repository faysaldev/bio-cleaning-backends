"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = __importDefault(require("./dashboard.controller"));
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const isAdmin_middleware_1 = require("../../middlewares/isAdmin.middleware");
const router = (0, express_1.Router)();
router.get("/stats", auth_middleware_1.authMiddleware, isAdmin_middleware_1.isAdmin, dashboard_controller_1.default.getStats);
router.get("/recent-bookings", auth_middleware_1.authMiddleware, isAdmin_middleware_1.isAdmin, dashboard_controller_1.default.getRecentBookings);
exports.default = router;

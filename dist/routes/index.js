"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// Domain routes
const auth_route_1 = __importDefault(require("../domains/Auth/auth.route"));
const user_route_1 = __importDefault(require("../domains/Admin-Auth/user.route"));
const booking_route_1 = __importDefault(require("../domains/Booking/booking.route"));
const contact_route_1 = __importDefault(require("../domains/Contact/contact.route"));
const service_route_1 = __importDefault(require("../domains/Service/service.route"));
const dashboard_route_1 = __importDefault(require("../domains/Dashboard/dashboard.route"));
const asset_route_1 = __importDefault(require("../domains/Asset/asset.route"));
// Initialize the router
const router = (0, express_1.Router)();
// Auth routes
router.use("/auth", auth_route_1.default);
// User management routes
router.use("/users", user_route_1.default);
// Business domains
router.use("/bookings", booking_route_1.default);
router.use("/contact", contact_route_1.default);
router.use("/services", service_route_1.default);
router.use("/dashboard", dashboard_route_1.default);
router.use("/assets", asset_route_1.default);
exports.default = router;

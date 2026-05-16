"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const booking_model_1 = __importDefault(require("../Booking/booking.model"));
const calculateChange = (current, previous) => {
    if (previous === 0)
        return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
};
const getStats = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    // 1. Revenue
    const currentRevenueData = yield booking_model_1.default.aggregate([
        { $match: { status: "COMPLETED", createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const prevRevenueData = yield booking_model_1.default.aggregate([
        { $match: { status: "COMPLETED", createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const currentRevenue = ((_a = currentRevenueData[0]) === null || _a === void 0 ? void 0 : _a.total) || 0;
    const prevRevenue = ((_b = prevRevenueData[0]) === null || _b === void 0 ? void 0 : _b.total) || 0;
    // 2. Bookings (Total created)
    const currentBookings = yield booking_model_1.default.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    const prevBookings = yield booking_model_1.default.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } });
    // 3. Completed Bookings
    const currentCompleted = yield booking_model_1.default.countDocuments({ status: "COMPLETED", createdAt: { $gte: thirtyDaysAgo } });
    const prevCompleted = yield booking_model_1.default.countDocuments({ status: "COMPLETED", createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } });
    // 4. Unique Clients
    const currentClientsData = yield booking_model_1.default.distinct("customerDetails.email", { createdAt: { $gte: thirtyDaysAgo } });
    const prevClientsData = yield booking_model_1.default.distinct("customerDetails.email", { createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } });
    const currentClientsCount = currentClientsData.length;
    const prevClientsCount = prevClientsData.length;
    // 5. Latest 5 Unique Clients
    const clientList = yield booking_model_1.default.aggregate([
        { $sort: { createdAt: -1 } },
        { $group: {
                _id: "$customerDetails.email",
                name: { $first: "$customerDetails.name" },
                phone: { $first: "$customerDetails.phone" },
                lastBooking: { $first: "$createdAt" }
            }
        },
        { $sort: { lastBooking: -1 } },
        { $limit: 5 },
        { $project: { _id: 0, email: "$_id", name: 1, phone: 1 } }
    ]);
    return {
        revenue: {
            value: currentRevenue,
            change: calculateChange(currentRevenue, prevRevenue)
        },
        bookings: {
            value: currentBookings,
            change: calculateChange(currentBookings, prevBookings)
        },
        completed: {
            value: currentCompleted,
            change: calculateChange(currentCompleted, prevCompleted)
        },
        clients: {
            value: currentClientsCount,
            change: calculateChange(currentClientsCount, prevClientsCount)
        },
        clientList
    };
});
const getRecentBookings = () => __awaiter(void 0, void 0, void 0, function* () {
    const recentBookings = yield booking_model_1.default.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select("customerDetails.name serviceType date status reference");
    return recentBookings.map(b => ({
        name: b.customerDetails.name,
        type: b.serviceType,
        date: b.date,
        status: b.status,
        reference: b.reference
    }));
});
const dashboardService = {
    getStats,
    getRecentBookings,
};
exports.default = dashboardService;

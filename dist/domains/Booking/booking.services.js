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
const booking_model_1 = __importDefault(require("./booking.model"));
const errors_1 = require("../../lib/errors");
const mail_service_1 = require("../../lib/mail.service");
const emailTemplates_1 = require("../../lib/templates/emailTemplates");
const createBooking = (data) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if timeslot is already booked for that date
    const existingBooking = yield booking_model_1.default.findOne({
        date: new Date(data.date),
        timeSlot: data.timeSlot,
        status: { $in: ["PENDING", "CONFIRMED", "COMPLETED"] },
    });
    if (existingBooking) {
        throw new errors_1.BadRequestError("This time slot is already booked for the selected date.");
    }
    // Generate reference BIO-XXXXX
    const count = yield booking_model_1.default.countDocuments();
    const reference = `BIO-${10000 + count + 1}`;
    const booking = yield booking_model_1.default.create(Object.assign(Object.assign({}, data), { reference, date: new Date(data.date) }));
    return booking;
});
const getAllBookings = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const { page = 1, limit = 10, search, status } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter = {};
    if (search) {
        filter.$or = [
            { reference: { $regex: search, $options: "i" } },
            { "customerDetails.name": { $regex: search, $options: "i" } },
            { "customerDetails.email": { $regex: search, $options: "i" } },
        ];
    }
    if (status) {
        filter.status = status;
    }
    const bookings = yield booking_model_1.default.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));
    const total = yield booking_model_1.default.countDocuments(filter);
    return {
        bookings,
        meta: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
        },
    };
});
const getBookingById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const booking = yield booking_model_1.default.findById(id);
    if (!booking) {
        throw new errors_1.NotFoundError("Booking not found");
    }
    return booking;
});
const updateBookingStatus = (id, status) => __awaiter(void 0, void 0, void 0, function* () {
    const booking = yield booking_model_1.default.findByIdAndUpdate(id, { status }, { new: true });
    if (!booking) {
        throw new errors_1.NotFoundError("Booking not found");
    }
    // Send email notification
    try {
        const emailHtml = (0, emailTemplates_1.bookingStatusTemplate)({
            name: booking.customerDetails.name,
            status: booking.status,
            date: new Date(booking.date).toLocaleDateString(),
            time: booking.timeSlot,
            reference: booking.reference,
        });
        yield (0, mail_service_1.sendEmail)(booking.customerDetails.email, `Booking Update: ${booking.reference} is now ${booking.status}`, `Your booking ${booking.reference} status has been updated to ${booking.status}.`, emailHtml);
    }
    catch (error) {
        console.error("Failed to send booking status email:", error);
    }
    return booking;
});
const getBookedSlots = (date) => __awaiter(void 0, void 0, void 0, function* () {
    const bookings = yield booking_model_1.default.find({
        date: new Date(date),
        status: { $in: ["PENDING", "CONFIRMED", "COMPLETED"] },
    }).select("timeSlot");
    return bookings.map(b => b.timeSlot);
});
const bookingService = {
    createBooking,
    getAllBookings,
    getBookingById,
    updateBookingStatus,
    getBookedSlots,
};
exports.default = bookingService;

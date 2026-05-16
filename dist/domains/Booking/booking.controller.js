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
const http_status_1 = __importDefault(require("http-status"));
const response_1 = require("../../lib/response");
const errorsHandle_1 = require("../../lib/errorsHandle");
const booking_services_1 = __importDefault(require("./booking.services"));
const createBooking = (0, errorsHandle_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield booking_services_1.default.createBooking(req.body);
    res.status(http_status_1.default.CREATED).json((0, response_1.response)({
        message: "Booking created successfully",
        status: "CREATED",
        statusCode: http_status_1.default.CREATED,
        data: result,
    }));
}));
const getAllBookings = (0, errorsHandle_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield booking_services_1.default.getAllBookings(req.query);
    res.status(http_status_1.default.OK).json((0, response_1.response)({
        message: "Bookings retrieved successfully",
        status: "OK",
        statusCode: http_status_1.default.OK,
        data: result.bookings,
        type: result.meta,
    }));
}));
const getBookingById = (0, errorsHandle_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield booking_services_1.default.getBookingById(req.params.id);
    res.status(http_status_1.default.OK).json((0, response_1.response)({
        message: "Booking retrieved successfully",
        status: "OK",
        statusCode: http_status_1.default.OK,
        data: result,
    }));
}));
const updateBookingStatus = (0, errorsHandle_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield booking_services_1.default.updateBookingStatus(req.params.id, req.body.status);
    res.status(http_status_1.default.OK).json((0, response_1.response)({
        message: "Booking status updated successfully",
        status: "OK",
        statusCode: http_status_1.default.OK,
        data: result,
    }));
}));
const getBookedSlots = (0, errorsHandle_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const date = req.query.date;
    const result = yield booking_services_1.default.getBookedSlots(date);
    res.status(http_status_1.default.OK).json((0, response_1.response)({
        message: "Booked slots retrieved successfully",
        status: "OK",
        statusCode: http_status_1.default.OK,
        data: result,
    }));
}));
const bookingController = {
    createBooking,
    getAllBookings,
    getBookingById,
    updateBookingStatus,
    getBookedSlots,
};
exports.default = bookingController;

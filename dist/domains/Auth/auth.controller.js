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
const auth_services_1 = __importDefault(require("./auth.services"));
const login = (0, errorsHandle_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield auth_services_1.default.login(req.body);
    res.status(http_status_1.default.OK).json((0, response_1.response)({
        message: "Login successful",
        status: "OK",
        statusCode: http_status_1.default.OK,
        data: result.user,
        token: result.token,
    }));
}));
const register = (0, errorsHandle_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield auth_services_1.default.register(req.body);
    res.status(http_status_1.default.OK).json((0, response_1.response)({
        message: "Register successful",
        status: "OK",
        statusCode: http_status_1.default.OK,
        data: result.user,
        token: result.token,
    }));
}));
const forgotPassword = (0, errorsHandle_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield auth_services_1.default.forgotPassword(req.body.email);
    res.status(http_status_1.default.OK).json((0, response_1.response)({
        message: "Password reset link sent to email",
        status: "OK",
        statusCode: http_status_1.default.OK,
    }));
}));
const resetPassword = (0, errorsHandle_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield auth_services_1.default.resetPassword(req.query.token, req.body.password);
    res.status(http_status_1.default.OK).json((0, response_1.response)({
        message: "Password reset successful",
        status: "OK",
        statusCode: http_status_1.default.OK,
    }));
}));
const logout = (0, errorsHandle_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.status(http_status_1.default.OK).json((0, response_1.response)({
        message: "Logout successful",
        status: "OK",
        statusCode: http_status_1.default.OK,
    }));
}));
const changePassword = (0, errorsHandle_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield auth_services_1.default.changePassword(req.user._id, req.body);
    res.status(http_status_1.default.OK).json((0, response_1.response)({
        message: "Password changed successfully",
        status: "OK",
        statusCode: http_status_1.default.OK,
    }));
}));
const authController = {
    login,
    logout,
    register,
    forgotPassword,
    resetPassword,
    changePassword,
};
exports.default = authController;

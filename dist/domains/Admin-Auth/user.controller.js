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
const user_model_1 = __importDefault(require("./user.model"));
const errors_1 = require("../../lib/errors");
const getProfile = (0, errorsHandle_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.default.findById(req.user._id);
    res.status(http_status_1.default.OK).json((0, response_1.response)({
        message: "Profile retrieved successfully",
        status: "OK",
        statusCode: http_status_1.default.OK,
        data: user,
    }));
}));
const updateProfile = (0, errorsHandle_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.default.findByIdAndUpdate(req.user._id, req.body, { new: true });
    res.status(http_status_1.default.OK).json((0, response_1.response)({
        message: "Profile updated successfully",
        status: "OK",
        statusCode: http_status_1.default.OK,
        data: user,
    }));
}));
const changePassword = (0, errorsHandle_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { oldPassword, newPassword } = req.body;
    const user = yield user_model_1.default.findById(req.user._id).select("+password");
    if (!user || !(yield user.isPasswordMatch(oldPassword))) {
        throw new errors_1.BadRequestError("Invalid old password");
    }
    user.password = newPassword;
    yield user.save();
    res.status(http_status_1.default.OK).json((0, response_1.response)({
        message: "Password changed successfully",
        status: "OK",
        statusCode: http_status_1.default.OK,
    }));
}));
const getAllUsers = (0, errorsHandle_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const users = yield user_model_1.default.find({ isDeleted: false });
    res.status(http_status_1.default.OK).json((0, response_1.response)({
        message: "Users retrieved successfully",
        status: "OK",
        statusCode: http_status_1.default.OK,
        data: users,
    }));
}));
const userController = {
    getProfile,
    updateProfile,
    changePassword,
    getAllUsers,
};
exports.default = userController;

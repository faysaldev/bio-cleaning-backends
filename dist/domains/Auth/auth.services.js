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
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = __importDefault(require("../Admin-Auth/user.model"));
const errors_1 = require("../../lib/errors");
const crypto_1 = __importDefault(require("crypto"));
const mail_service_1 = require("../../lib/mail.service");
const login = (data) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = data;
    const user = yield user_model_1.default.findOne({ email, isDeleted: false }).select("+password");
    if (!user) {
        throw new errors_1.NotFoundError("User not found");
    }
    const isMatch = yield user.isPasswordMatch(password);
    if (!isMatch) {
        throw new errors_1.BadRequestError("Invalid password");
    }
    const token = jsonwebtoken_1.default.sign({
        userId: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        image: user.image,
    }, process.env.JWT_SECRET, { expiresIn: "7d" });
    return {
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        },
        token,
    };
});
const register = (data) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password, name } = data;
    const user = yield user_model_1.default.findOne({ email, isDeleted: false });
    if (user) {
        throw new errors_1.BadRequestError("User already exists");
    }
    const newUser = yield user_model_1.default.create({
        email,
        password,
        name,
        role: "admin", // Default to admin for this project as per request
    });
    const token = jsonwebtoken_1.default.sign({
        userId: newUser._id,
        role: newUser.role,
        name: newUser.name,
        email: newUser.email,
    }, process.env.JWT_SECRET, { expiresIn: "7d" });
    return {
        user: {
            id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
        },
        token,
    };
});
const forgotPassword = (email) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.default.findOne({ email, isDeleted: false });
    if (!user) {
        throw new errors_1.NotFoundError("User not found");
    }
    const resetToken = crypto_1.default.randomBytes(20).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    yield user.save();
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const message = `You are receiving this email because you (or someone else) have requested the reset of a password. \n\n Please click on the following link, or paste this into your browser to complete the process:\n\n ${resetUrl}`;
    yield (0, mail_service_1.sendEmail)(user.email, "Password Reset Request", message);
});
const resetPassword = (token, password) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.default.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
        throw new errors_1.BadRequestError("Password reset token is invalid or has expired");
    }
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    yield user.save();
});
const changePassword = (userId, data) => __awaiter(void 0, void 0, void 0, function* () {
    const { oldPassword, newPassword } = data;
    const user = yield user_model_1.default.findById(userId).select("+password");
    if (!user) {
        throw new errors_1.NotFoundError("User not found");
    }
    const isMatch = yield user.isPasswordMatch(oldPassword);
    if (!isMatch) {
        throw new errors_1.BadRequestError("Invalid old password");
    }
    user.password = newPassword;
    yield user.save();
});
const authService = {
    login,
    register,
    forgotPassword,
    resetPassword,
    changePassword,
};
exports.default = authService;

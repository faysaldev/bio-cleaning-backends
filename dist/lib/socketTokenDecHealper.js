"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketHelper = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const socketHelper = (token) => {
    const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
    const user = {
        _id: decoded.userId,
        role: decoded.role,
        name: decoded.name,
        email: decoded.email,
        password: decoded.password,
        image: decoded.image,
        dateOfBirth: decoded.dateOfBirth,
    };
    return user;
};
exports.socketHelper = socketHelper;

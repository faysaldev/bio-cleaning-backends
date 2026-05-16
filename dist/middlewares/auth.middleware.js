"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authMiddleware = (req, res, next) => {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
    if (!token) {
        return res.status(401).json({ error: "Unauthorized Access Denied 😐" });
    }
    try {
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
        req.user = user;
        next();
    }
    catch (error) {
        res.status(400).json({ error: "Invalid token" });
    }
};
exports.authMiddleware = authMiddleware;

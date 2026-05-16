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
exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const ENV_1 = require("../config/ENV");
// Send Email (Using Nodemailer for verification)
const sendEmail = (to, subject, text, html) => __awaiter(void 0, void 0, void 0, function* () {
    const transporter = nodemailer_1.default.createTransport({
        service: "Gmail",
        from: ENV_1.EMAIL_USERNAME,
        auth: {
            user: ENV_1.EMAIL_USERNAME,
            pass: ENV_1.EMAIL_PASSWORD,
        },
    });
    try {
        yield transporter.sendMail({
            from: `"Bio Cleaning LLC" <${ENV_1.EMAIL_USERNAME}>`,
            to,
            subject,
            html,
            text,
        });
    }
    catch (error) {
        console.error("Error sending email", error);
        throw new Error("Error sending email");
    }
});
exports.sendEmail = sendEmail;

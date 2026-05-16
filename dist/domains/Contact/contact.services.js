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
const contact_model_1 = __importDefault(require("./contact.model"));
const errors_1 = require("../../lib/errors");
const mail_service_1 = require("../../lib/mail.service");
const emailTemplates_1 = require("../../lib/templates/emailTemplates");
const createContact = (data) => __awaiter(void 0, void 0, void 0, function* () {
    const contact = yield contact_model_1.default.create(data);
    return contact;
});
const getAllContacts = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const { page = 1, limit = 10, search, status } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter = {};
    if (search) {
        filter.$or = [
            { fullName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
        ];
    }
    if (status) {
        filter.status = status;
    }
    const contacts = yield contact_model_1.default.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));
    const total = yield contact_model_1.default.countDocuments(filter);
    return {
        contacts,
        meta: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
        },
    };
});
const replyToContact = (id, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const contact = yield contact_model_1.default.findByIdAndUpdate(id, { reply, status: "REPLIED" }, { new: true });
    if (!contact) {
        throw new errors_1.NotFoundError("Contact message not found");
    }
    // Send email notification
    try {
        const emailHtml = (0, emailTemplates_1.contactReplyTemplate)({
            name: contact.fullName,
            originalMessage: contact.message,
            replyMessage: reply,
        });
        yield (0, mail_service_1.sendEmail)(contact.email, `Re: ${contact.service} - BIO Cleaning LLC`, reply, emailHtml);
    }
    catch (error) {
        console.error("Failed to send contact reply email:", error);
    }
    return contact;
});
const contactService = {
    createContact,
    getAllContacts,
    replyToContact,
};
exports.default = contactService;

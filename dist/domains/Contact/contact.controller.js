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
const contact_services_1 = __importDefault(require("./contact.services"));
const createContact = (0, errorsHandle_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield contact_services_1.default.createContact(req.body);
    res.status(http_status_1.default.CREATED).json((0, response_1.response)({
        message: "Contact message sent successfully",
        status: "CREATED",
        statusCode: http_status_1.default.CREATED,
        data: result,
    }));
}));
const getAllContacts = (0, errorsHandle_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield contact_services_1.default.getAllContacts(req.query);
    res.status(http_status_1.default.OK).json((0, response_1.response)({
        message: "Contact messages retrieved successfully",
        status: "OK",
        statusCode: http_status_1.default.OK,
        data: result.contacts,
        type: result.meta,
    }));
}));
const replyToContact = (0, errorsHandle_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield contact_services_1.default.replyToContact(req.params.id, req.body.reply);
    console.log("🚀 ~ replyToContact ~ result:", result);
    res.status(http_status_1.default.OK).json((0, response_1.response)({
        message: "Reply sent successfully",
        status: "OK",
        statusCode: http_status_1.default.OK,
        data: result,
    }));
}));
const contactController = {
    createContact,
    getAllContacts,
    replyToContact,
};
exports.default = contactController;

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
const service_services_1 = __importDefault(require("./service.services"));
const createService = (0, errorsHandle_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield service_services_1.default.createService(req.body);
    res.status(http_status_1.default.CREATED).json((0, response_1.response)({
        message: "Service created successfully",
        status: "CREATED",
        statusCode: http_status_1.default.CREATED,
        data: result,
    }));
}));
const getAllServices = (0, errorsHandle_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield service_services_1.default.getAllServices(req.query);
    res.status(http_status_1.default.OK).json((0, response_1.response)({
        message: "Services retrieved successfully",
        status: "OK",
        statusCode: http_status_1.default.OK,
        data: result,
    }));
}));
const getAllServicesAdmin = (0, errorsHandle_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield service_services_1.default.getAllServicesAdmin();
    res.status(http_status_1.default.OK).json((0, response_1.response)({
        message: "Services retrieved successfully",
        status: "OK",
        statusCode: http_status_1.default.OK,
        data: result,
    }));
}));
const getServiceById = (0, errorsHandle_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield service_services_1.default.getServiceById(req.params.id);
    res.status(http_status_1.default.OK).json((0, response_1.response)({
        message: "Service retrieved successfully",
        status: "OK",
        statusCode: http_status_1.default.OK,
        data: result,
    }));
}));
const updateService = (0, errorsHandle_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(req.body);
    const result = yield service_services_1.default.updateService(req.params.id, req.body);
    res.status(http_status_1.default.OK).json((0, response_1.response)({
        message: "Service updated successfully",
        status: "OK",
        statusCode: http_status_1.default.OK,
        data: result,
    }));
}));
const deleteService = (0, errorsHandle_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield service_services_1.default.deleteService(req.params.id);
    res.status(http_status_1.default.OK).json((0, response_1.response)({
        message: "Service deleted successfully",
        status: "OK",
        statusCode: http_status_1.default.OK,
    }));
}));
const getShortServices = (0, errorsHandle_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield service_services_1.default.getShortServices();
    res.status(http_status_1.default.OK).json((0, response_1.response)({
        message: "Short service details retrieved successfully",
        status: "OK",
        statusCode: http_status_1.default.OK,
        data: result,
    }));
}));
const serviceController = {
    createService,
    getAllServices,
    getServiceById,
    updateService,
    deleteService,
    getShortServices,
    getAllServicesAdmin,
};
exports.default = serviceController;

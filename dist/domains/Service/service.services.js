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
const service_model_1 = __importDefault(require("./service.model"));
const errors_1 = require("../../lib/errors");
const createService = (data) => __awaiter(void 0, void 0, void 0, function* () {
    const service = yield service_model_1.default.create(data);
    return service;
});
const getAllServices = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const { publishedOnly = "true" } = query;
    const filter = {};
    if (publishedOnly === "true") {
        // filter.publish = true;
        filter.isActive = true;
    }
    const services = yield service_model_1.default.find(filter).sort({ createdAt: -1 });
    return services;
});
const getAllServicesAdmin = () => __awaiter(void 0, void 0, void 0, function* () {
    const services = yield service_model_1.default.find().sort({ createdAt: -1 });
    return services;
});
const getServiceById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const service = yield service_model_1.default.findById(id);
    if (!service) {
        throw new errors_1.NotFoundError("Service not found");
    }
    return service;
});
const updateService = (id, data) => __awaiter(void 0, void 0, void 0, function* () {
    const service = yield service_model_1.default.findByIdAndUpdate(id, data, { new: true });
    if (!service) {
        throw new errors_1.NotFoundError("Service not found");
    }
    return service;
});
const deleteService = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const service = yield service_model_1.default.findByIdAndDelete(id);
    if (!service) {
        throw new errors_1.NotFoundError("Service not found");
    }
    return service;
});
const getShortServices = () => __awaiter(void 0, void 0, void 0, function* () {
    const services = yield service_model_1.default.find({ isActive: true })
        .select("tags name _id basePrice isActive duration description")
        .sort({ createdAt: -1 });
    return services;
});
const serviceService = {
    createService,
    getAllServices,
    getServiceById,
    updateService,
    deleteService,
    getShortServices,
    getAllServicesAdmin,
};
exports.default = serviceService;

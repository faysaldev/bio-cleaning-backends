"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asset_controller_1 = __importDefault(require("./asset.controller"));
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const fileUpload_middleware_1 = require("../../middlewares/fileUpload.middleware");
const router = (0, express_1.Router)();
router.post("/upload", auth_middleware_1.authMiddleware, (0, fileUpload_middleware_1.cloudinaryFileUploadMiddleware)().single("file"), (0, fileUpload_middleware_1.processCloudinarySingleUpload)("assets", "file"), asset_controller_1.default.uploadAsset);
exports.default = router;

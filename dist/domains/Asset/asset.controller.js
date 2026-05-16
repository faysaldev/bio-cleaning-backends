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
const uploadAsset = (0, errorsHandle_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const url = req.body.file; // Assuming the middleware puts the URL in req.body.file
    res.status(http_status_1.default.OK).json((0, response_1.response)({
        message: "Asset uploaded successfully",
        status: "OK",
        statusCode: http_status_1.default.OK,
        data: { url, publicId: (_a = url.split("/").pop()) === null || _a === void 0 ? void 0 : _a.split(".")[0] },
    }));
}));
const assetController = {
    uploadAsset,
};
exports.default = assetController;

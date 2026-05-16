"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const index_1 = __importDefault(require("./routes/index"));
const compression_1 = __importDefault(require("compression"));
const errorsHandle_1 = require("./lib/errorsHandle");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
// TODO: for local only
app.use((0, cors_1.default)({
    origin: "*", // allow only this origin to access the API
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], // allow only these HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // allow only these headers
}));
// parse urlencoded request body
app.use(express_1.default.urlencoded({ extended: true }));
// compression the all data
app.use((0, compression_1.default)());
// Use the logging middleware for all routes
// app.use(logRequestResponse);
// Use the centralized routes
app.get("/", (req, res) => {
    res.send("Hello, TypeScript with Node and Express!");
});
app.use("/api/v1", index_1.default);
// Handle 404 - Route not found
app.use(errorsHandle_1.notFoundHandler);
// Global error handler - must be last middleware
app.use(errorsHandle_1.globalErrorHandler);
exports.default = app;

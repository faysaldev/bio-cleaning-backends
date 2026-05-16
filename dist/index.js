"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const ENV_1 = require("./config/ENV");
const server_1 = __importDefault(require("./server"));
const db_1 = __importDefault(require("./config/db"));
(0, db_1.default)();
// For local development and persistent servers
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    const server = http_1.default.createServer(server_1.default);
    server.listen(ENV_1.PORT || 9500, () => {
        console.log(`Server is running at http://localhost:${ENV_1.PORT || 9500}`);
    });
}
// Export the app for Vercel
exports.default = server_1.default;

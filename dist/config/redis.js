"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ quiet: true });
const redis = new ioredis_1.default({
    host: process.env.REDIS_HOST, // Redis host (e.g., "localhost")
    port: Number(process.env.REDIS_PORT), // Convert the port to a number
    password: process.env.REDIS_PASSWORD || "", // Use default empty string if no password
    db: Number(process.env.REDIS_DB), // Convert db to a number (default is 0)
});
exports.default = redis;

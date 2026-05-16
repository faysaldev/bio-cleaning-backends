"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.response = void 0;
const response = (response = {}) => {
    const responseObject = {
        code: response.statusCode,
        message: response.message,
        status: response.status,
        data: {},
    };
    if (response.type) {
        responseObject.data.type = response.type;
    }
    if (response.data) {
        responseObject.data = response.data;
    }
    if (response.token) {
        responseObject.data.token = response.token; // Fixed typo: changed `response.tokens` to `response.token`
    }
    return responseObject;
};
exports.response = response;

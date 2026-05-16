"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zodValidate = void 0;
const zod_1 = require("zod");
// Generic validation middleware
const zodValidate = (schema, property) => {
    return (req, res, next) => {
        const data = req[property];
        try {
            schema.parse(data);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errors = error.issues.map((issue) => ({
                    path: issue.path.join("."),
                    message: issue.message,
                }));
                return res.status(400).json({ errors });
            }
            next(error);
        }
    };
};
exports.zodValidate = zodValidate;

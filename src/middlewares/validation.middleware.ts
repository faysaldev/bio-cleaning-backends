import { Request, Response, NextFunction } from "express";
import Joi from "joi";

const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      // If validation fails, return a 400 status with the validation error message
      return res.status(400).json({ error: error.details[0].message });
    }
    next(); // Proceed to the next middleware (controller)
  };
};

export default validate;

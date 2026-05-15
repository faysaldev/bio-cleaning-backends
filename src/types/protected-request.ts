import { Request } from "express";

export interface ProtectedRequest extends Request {
  user?: {
    _id: string;
    role: "admin" | "user";
    name: string;
    email: string;
    image?: string;
    dateOfBirth?: Date;
  };
}

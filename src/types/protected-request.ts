import { Request } from "express";

export interface ProtectedRequest extends Request {
  user?: {
    _id: string;
    sessionId: string;
    role: "admin" | "user";
    name: string;
    email: string;
    image?: string;
    dateOfBirth?: Date;
  };
}

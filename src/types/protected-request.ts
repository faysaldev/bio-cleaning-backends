import { Request } from "express";

export interface ProtectedRequest extends Request {
  user?: {
    _id: string;
    sessionId: string;
    role: "owner" | "admin" | "manager" | "dispatcher" | "cleaner" | "support" | "read_only" | "user";
    name: string;
    email: string;
    image?: string;
    dateOfBirth?: Date;
  };
}

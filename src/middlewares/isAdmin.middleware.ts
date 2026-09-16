import { NextFunction, Response } from "express";
import { managementRoles } from "../config/roles";
import { ProtectedRequest } from "../types/protected-request";
import { ForbiddenError } from "../lib/errors";

// Backwards-compatible middleware name. It now means "admin workspace access"
// rather than only the literal admin role.
export const isAdmin = (req: ProtectedRequest, _res: Response, next: NextFunction) => {
  if (req.user && managementRoles.includes(req.user.role as any)) return next();
  return next(new ForbiddenError("Administrative workspace access is required"));
};

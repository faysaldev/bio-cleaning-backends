import { NextFunction, Response } from "express";
import { ProtectedRequest } from "../types/protected-request";
import { ForbiddenError } from "../lib/errors";
import type { RoleType } from "../config/roles";

export const requireRoles = (...allowedRoles: RoleType[]) =>
  (req: ProtectedRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role as RoleType)) {
      return next(new ForbiddenError("You do not have permission to perform this action"));
    }
    return next();
  };

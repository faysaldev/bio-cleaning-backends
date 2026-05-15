import { Response, NextFunction } from "express";
import { ProtectedRequest } from "../types/protected-request";

export const isAdmin = (req: ProtectedRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ error: "Access denied. Admins only." });
  }
};

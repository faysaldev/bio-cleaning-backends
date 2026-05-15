import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ProtectedRequest } from "../types/protected-request";

export const authMiddleware = (
  req: ProtectedRequest,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized Access Denied 😐" });
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const user = {
      _id: decoded.userId,
      role: decoded.role,
      name: decoded.name,
      email: decoded.email,
      password: decoded.password,
      image: decoded.image,
      dateOfBirth: decoded.dateOfBirth,
    };
    req.user = user;

    next();
  } catch (error) {
    res.status(400).json({ error: "Invalid token" });
  }
};

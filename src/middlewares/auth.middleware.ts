import { Response, NextFunction } from "express";
import { ProtectedRequest } from "../types/protected-request";
import User from "../domains/Admin-Auth/user.model";
import AuthSession from "../domains/Auth/authSession.model";
import {
  ACCESS_COOKIE_NAME,
  getCookie,
  verifyAccessToken,
} from "../lib/authTokens";
import { ForbiddenError, UnauthorizedError } from "../lib/errors";

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const authMiddleware = async (
  req: ProtectedRequest,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const cookieToken = getCookie(req, ACCESS_COOKIE_NAME);
    const bearerToken = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : undefined;
    const token = cookieToken || bearerToken;

    if (!token) throw new UnauthorizedError("Authentication required");

    const decoded = verifyAccessToken(token);
    if (
      decoded.tokenType !== "access" ||
      !decoded.userId ||
      !decoded.sessionId
    ) {
      throw new UnauthorizedError("Invalid access session");
    }

    const [user, session] = await Promise.all([
      User.findOne({ _id: decoded.userId, isDeleted: false }),
      AuthSession.findOne({
        _id: decoded.sessionId,
        userId: decoded.userId,
        expiresAt: { $gt: new Date() },
      }).select("+csrfToken"),
    ]);

    if (!user || !session) throw new UnauthorizedError("Session is no longer active");

    if (cookieToken && unsafeMethods.has(req.method.toUpperCase())) {
      const csrfHeader = req.headers["x-csrf-token"];
      if (typeof csrfHeader !== "string" || csrfHeader !== session.csrfToken) {
        throw new ForbiddenError("Invalid CSRF token");
      }
    }

    req.user = {
      _id: String(user._id),
      sessionId: String(session._id),
      role: user.role,
      name: user.name,
      email: user.email,
      image: user.image,
      dateOfBirth: user.dateOfBirth,
    };

    next();
  } catch (error) {
    next(error);
  }
};

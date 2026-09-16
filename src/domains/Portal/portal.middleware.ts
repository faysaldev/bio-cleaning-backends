import { NextFunction, Request, Response } from "express";
import { hashToken, getCookie } from "../../lib/authTokens";
import { ForbiddenError, UnauthorizedError } from "../../lib/errors";
import PortalSession from "./portalSession.model";

export const PORTAL_COOKIE_NAME = "bio_portal_session";
const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export interface PortalRequest extends Request {
  portal?: { customerId: string; sessionId: string };
}

export const portalAuthMiddleware = async (req: PortalRequest, _res: Response, next: NextFunction) => {
  try {
    const raw = getCookie(req, PORTAL_COOKIE_NAME);
    if (!raw) throw new UnauthorizedError("Customer portal sign-in required");
    const session: any = await PortalSession.findOne({ tokenHash: hashToken(raw), expiresAt: { $gt: new Date() } }).select("+tokenHash +csrfToken");
    if (!session) throw new UnauthorizedError("Customer portal session is invalid or expired");
    if (unsafeMethods.has(req.method.toUpperCase())) {
      const csrf = req.header("x-portal-csrf");
      if (!csrf || csrf !== session.csrfToken) throw new ForbiddenError("Invalid portal CSRF token");
    }
    if (!session.lastSeenAt || Date.now() - new Date(session.lastSeenAt).getTime() > 15 * 60 * 1000) {
      void PortalSession.updateOne({ _id: session._id }, { $set: { lastSeenAt: new Date() } }).catch(() => undefined);
    }
    req.portal = { customerId: String(session.customerId), sessionId: String(session._id) };
    next();
  } catch (error) {
    next(error);
  }
};

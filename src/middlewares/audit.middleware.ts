import { NextFunction, Request, Response } from "express";
import AuditLog from "../domains/Audit/auditLog.model";
import { auditExpiresAt, auditMetadata, hashIp } from "../domains/Audit/audit.service";
import type { ProtectedRequest } from "../types/protected-request";

const mutating = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const entityFromPath = (path: string) => {
  const clean = path.replace(/^\/api\/v\d+\//, "").split("?")[0];
  const segments = clean.split("/").filter(Boolean);
  const entityType = segments[0] || "resource";
  const candidate = segments[1];
  const entityId = candidate && !["public", "admin", "manage", "summary", "settings", "cron", "me"].includes(candidate) ? candidate : undefined;
  return [entityType, entityId] as const;
};

export const auditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!mutating.has(req.method.toUpperCase())) return next();
  const started = Date.now();
  res.on("finish", () => {
    const protectedReq = req as ProtectedRequest & { requestId?: string };
    if (!protectedReq.user || req.path.includes("/auth/")) return;
    const [entityType, entityId] = entityFromPath(req.originalUrl);
    void AuditLog.create({
      actorId: protectedReq.user._id,
      actorEmail: protectedReq.user.email,
      actorRole: protectedReq.user.role,
      action: `${req.method.toUpperCase()} ${entityType || "resource"}`,
      method: req.method.toUpperCase(),
      path: req.originalUrl,
      entityType,
      entityId,
      requestId: protectedReq.requestId,
      ipHash: hashIp(req.ip || req.socket.remoteAddress),
      statusCode: res.statusCode,
      metadata: { durationMs: Date.now() - started, body: auditMetadata(req.body) },
      expiresAt: auditExpiresAt(),
    }).catch(() => undefined);
  });
  next();
};

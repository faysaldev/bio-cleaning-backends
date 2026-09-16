import crypto from "crypto";
import AuditLog from "./auditLog.model";
import { AUDIT_LOG_RETENTION_DAYS } from "../../config/ENV";

const sensitiveKeys = new Set(["password", "token", "secret", "csrfToken", "authorization", "card", "paymentMethod", "email", "phone", "address", "notes", "comment", "message", "accessInstructions"]);
const sanitize = (value: unknown, depth = 0): unknown => {
  if (depth > 3) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitize(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 50).map(([key, item]) => [
      key,
      sensitiveKeys.has(key) || /password|secret|token|authorization/i.test(key) ? "[redacted]" : sanitize(item, depth + 1),
    ]));
  }
  return typeof value === "string" && value.length > 1000 ? `${value.slice(0, 1000)}…` : value;
};

export const hashIp = (ip?: string) => ip ? crypto.createHash("sha256").update(`${process.env.AUDIT_IP_SALT || "bio"}:${ip}`).digest("hex") : undefined;
export const auditMetadata = sanitize;

export const listAuditLogs = async (query: Record<string, unknown>) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 30)));
  const filter: Record<string, unknown> = {};
  if (typeof query.action === "string" && query.action) filter.action = query.action;
  if (typeof query.actorId === "string" && query.actorId) filter.actorId = query.actorId;
  if (typeof query.entityType === "string" && query.entityType) filter.entityType = query.entityType;
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const auditExpiresAt = () => new Date(Date.now() + AUDIT_LOG_RETENTION_DAYS * 86400000);

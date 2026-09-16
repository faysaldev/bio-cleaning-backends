import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import IdempotencyRecord from "../domains/Idempotency/idempotency.model";
import { ConflictError } from "../lib/errors";

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonicalize(item)]));
  }
  return value;
};
const stableHash = (value: unknown) => crypto.createHash("sha256").update(JSON.stringify(canonicalize(value ?? null))).digest("hex");

export const idempotency = (scope: string, ttlHours = 24) => async (req: Request, res: Response, next: NextFunction) => {
  const rawKey = req.header("Idempotency-Key")?.trim();
  if (!rawKey) return next();
  if (rawKey.length < 8 || rawKey.length > 160) return next(new ConflictError("Idempotency-Key must be between 8 and 160 characters"));

  const requestHash = stableHash({ method: req.method, path: req.baseUrl + req.path, query: req.query, body: req.body });
  let record: any;
  try {
    record = await IdempotencyRecord.create({ key: rawKey, scope, requestHash, expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000) });
  } catch (error: any) {
    if (error?.code !== 11000) return next(error);
    const existing: any = await IdempotencyRecord.findOne({ scope, key: rawKey }).lean();
    if (!existing) return next(new ConflictError("This request is already being processed"));
    if (existing.requestHash !== requestHash) return next(new ConflictError("Idempotency-Key was already used for a different request"));
    if (existing.status === "COMPLETED") return res.status(existing.responseStatus || 200).json(existing.responseBody);
    return next(new ConflictError("This request is already being processed"));
  }

  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (res.statusCode >= 500) {
      void IdempotencyRecord.deleteOne({ _id: record._id }).catch(() => undefined);
    } else {
      void IdempotencyRecord.updateOne({ _id: record._id }, { $set: { status: "COMPLETED", responseStatus: res.statusCode, responseBody: body } }).catch(() => undefined);
    }
    return originalJson(body);
  }) as Response["json"];
  next();
};

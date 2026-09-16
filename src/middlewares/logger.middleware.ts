import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import logger from "../lib/logger";

export type RequestWithId = Request & { requestId?: string };

const logRequestResponse = (req: RequestWithId, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  const incoming = req.header("x-request-id");
  req.requestId = incoming && /^[a-zA-Z0-9._:-]{8,128}$/.test(incoming) ? incoming : crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    logger.info("http_request", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl.split("?")[0],
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      userAgent: req.header("user-agent")?.slice(0, 300),
    });
  });
  next();
};
export default logRequestResponse;

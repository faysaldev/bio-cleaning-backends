import express, { Request, Response } from "express";
import mongoose from "mongoose";
import routes from "./routes/index";
import compression from "compression";
import connectionToDb from "./config/db";
import { globalErrorHandler, notFoundHandler } from "./lib/errorsHandle";
import cors, { CorsOptions } from "cors";
import { APP_RELEASE, CORS_ORIGINS, CSP_REPORT_URI, FRONTEND_URL, REDIS_HOST, REDIS_URL } from "./config/ENV";
import { stripeWebhookHandler } from "./domains/Payment/stripe.webhook";
import logRequestResponse from "./middlewares/logger.middleware";
import { auditMiddleware } from "./middlewares/audit.middleware";
import { getRedis } from "./config/redis";

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

const allowedOrigins = new Set(
  [FRONTEND_URL, ...CORS_ORIGINS].filter((value): value is string => Boolean(value)).map((value) => value.replace(/\/$/, "")),
);
if (process.env.NODE_ENV !== "production") ["http://localhost:3000", "http://127.0.0.1:3000"].forEach((origin) => allowedOrigins.add(origin));

const corsOptions: CorsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const normalized = origin.replace(/\/$/, "");
    if (allowedOrigins.has(normalized)) return callback(null, true);
    return callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Portal-CSRF", "Idempotency-Key", "X-Request-Id"],
  exposedHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset", "Retry-After", "X-Request-Id", "X-API-Version"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
// app.use(logRequestResponse);
app.use((req, res, next) => {
  res.setHeader("X-API-Version", "v1");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  res.setHeader("Content-Security-Policy", `default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'${CSP_REPORT_URI ? `; report-uri ${CSP_REPORT_URI}` : ""}`);
  if (process.env.NODE_ENV === "production") res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  next();
});

// Stripe requires the untouched request bytes for signature verification.
app.post("/api/v1/payments/stripe/webhook", express.raw({ type: "application/json", limit: "256kb" }), stripeWebhookHandler);
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true, limit: "256kb" }));
app.use(compression());
app.use(auditMiddleware);

app.get("/", (_req: Request, res: Response) =>
  res.status(200).json({
    status: "ok",
    service: "bio-cleaning-api",
    release: APP_RELEASE,
    message: "BIO Cleaning LLC API is running",
    time: new Date().toISOString(),
    endpoints: {
      health: "/health",
      ready: "/ready",
      version: "/version",
      api: "/api/v1",
    },
  }),
);
app.get("/health", (_req: Request, res: Response) => res.status(200).json({ status: "ok", service: "bio-cleaning-api", release: APP_RELEASE, time: new Date().toISOString() }));
app.get("/ready", async (_req: Request, res: Response) => {
  const database = mongoose.connection.readyState === 1 ? "ready" : "unavailable";
  let redis = REDIS_URL || REDIS_HOST ? "unavailable" : "not-configured";
  const client = await getRedis();
  if (client) {
    try { redis = (await client.ping()) === "PONG" ? "ready" : "unavailable"; } catch { redis = "unavailable"; }
  }
  const ready = database === "ready";
  res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not-ready", database, redis, release: APP_RELEASE });
});
app.get("/version", (_req: Request, res: Response) => res.json({ api: "v1", release: APP_RELEASE }));
app.use(async (req, _res, next) => {
  if (req.path === "/health" || req.path === "/version" || req.path === "/") {
    return next();
  }
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectionToDb();
    } catch (err) {
      return next(err);
    }
  }
  next();
});

app.use("/api/v1", routes);
app.use(notFoundHandler);
app.use(globalErrorHandler);
export default app;

import express, { Request, Response } from "express";
import routes from "./routes/index";
import compression from "compression";
import { globalErrorHandler, notFoundHandler } from "./lib/errorsHandle";
import cors, { CorsOptions } from "cors";
import { CORS_ORIGINS, FRONTEND_URL } from "./config/ENV";

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

const allowedOrigins = new Set(
  [FRONTEND_URL, ...CORS_ORIGINS]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.replace(/\/$/, "")),
);

if (process.env.NODE_ENV !== "production") {
  ["http://localhost:3000", "http://127.0.0.1:3000"].forEach((origin) =>
    allowedOrigins.add(origin),
  );
}

const corsOptions: CorsOptions = {
  credentials: true,
  origin(origin, callback) {
    // Server-to-server requests generally do not include Origin.
    if (!origin) return callback(null, true);
    const normalized = origin.replace(/\/$/, "");
    if (allowedOrigins.has(normalized)) return callback(null, true);
    return callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  exposedHeaders: [
    "RateLimit-Limit",
    "RateLimit-Remaining",
    "RateLimit-Reset",
    "Retry-After",
  ],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true, limit: "256kb" }));
app.use(compression());

app.get("/", (_req: Request, res: Response) => {
  res.send("BIO Cleaning API");
});

app.use("/api/v1", routes);
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;

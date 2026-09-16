import {
  CORS_ORIGINS,
  DATABASE_URL,
  FRONTEND_URL,
  JWT_REFRESH_SECRET,
  JWT_SECRET,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
} from "./ENV";

export const validateEnvironment = () => {
  const missing: string[] = [];
  if (!DATABASE_URL) missing.push("DATABASE_URL");
  if (!JWT_SECRET || JWT_SECRET.length < 32) missing.push("JWT_SECRET (>=32 chars)");
  if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET.length < 32) missing.push("JWT_REFRESH_SECRET (>=32 chars)");
  if (process.env.NODE_ENV === "production") {
    if (!FRONTEND_URL) missing.push("FRONTEND_URL");
    if (!CORS_ORIGINS.length && !FRONTEND_URL) missing.push("CORS_ORIGINS");
    if (STRIPE_SECRET_KEY && !STRIPE_WEBHOOK_SECRET) missing.push("STRIPE_WEBHOOK_SECRET when Stripe is enabled");
  }
  if (missing.length) throw new Error(`Environment validation failed: ${missing.join(", ")}`);
};

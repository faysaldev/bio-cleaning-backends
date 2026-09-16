import dotenv from "dotenv";
dotenv.config({ quiet: true });

const positiveNumber = (value: string | undefined, fallback: number, minimum = 1) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum ? parsed : fallback;
};

const sameSiteValue = (process.env.COOKIE_SAME_SITE || "lax").toLowerCase();

export const BACKEND_IP: string = process.env.BACKEND_IP as string;
export const PORT: number = parseInt(process.env.PORT || "9500", 10);
export const SOCKET_PORT: number = parseInt(process.env.SOCKET_PORT || "0", 10);
export const DATABASE_URL: string = process.env.DATABASE_URL as string;
export const JWT_SECRET: string = process.env.JWT_SECRET as string;
export const JWT_REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET as string;
export const EMAIL_USERNAME: string = process.env.EMAIL_USERNAME as string;
export const EMAIL_PASSWORD: string = process.env.EMAIL_PASSWORD as string;
export const STRIPE_SECRET_KEY: string = process.env.STRIPE_SECRET_KEY as string;
export const STRIPE_WEBHOOK_SECRET: string | undefined = process.env.STRIPE_WEBHOOK_SECRET;
export const FRONTEND_URL: string | undefined = process.env.FRONTEND_URL || process.env.FRONT_END_URL;
export const CORS_ORIGINS: string[] = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const ACCESS_TOKEN_TTL_SECONDS = positiveNumber(
  process.env.ACCESS_TOKEN_TTL_SECONDS,
  15 * 60,
  60,
);
export const REFRESH_TOKEN_TTL_DAYS = positiveNumber(
  process.env.REFRESH_TOKEN_TTL_DAYS,
  7,
);
export const REMEMBER_ME_REFRESH_TOKEN_TTL_DAYS = positiveNumber(
  process.env.REMEMBER_ME_REFRESH_TOKEN_TTL_DAYS,
  30,
);
export const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
export const COOKIE_SECURE =
  process.env.COOKIE_SECURE !== undefined
    ? process.env.COOKIE_SECURE === "true"
    : process.env.NODE_ENV === "production";
export const COOKIE_SAME_SITE: "lax" | "strict" | "none" =
  sameSiteValue === "strict" || sameSiteValue === "none" ? sameSiteValue : "lax";

export const REDIS_URL: string | undefined = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL;
export const REDIS_HOST: string | undefined = process.env.REDIS_HOST;
export const REDIS_PORT: string | undefined = process.env.REDIS_PORT;
export const REDIS_PASSWORD: string | undefined = process.env.REDIS_PASSWORD;
export const REDIS_DB: string | undefined = process.env.REDIS_DB;

export const R2_ACCOUNT_ID: string | undefined = process.env.R2_ACCOUNT_ID;
export const R2_ACCESS_KEY_ID: string | undefined = process.env.R2_ACCESS_KEY_ID;
export const R2_SECRET_ACCESS_KEY: string | undefined = process.env.R2_SECRET_ACCESS_KEY;
export const R2_BUCKET_NAME: string | undefined = process.env.R2_BUCKET_NAME;
export const R2_PUBLIC_URL: string | undefined = process.env.R2_PUBLIC_URL;
export const CRYPTO_SECRET_KEY: string | undefined =
  process.env.CRYPTO_SECRET_KEY;

export const PORTAL_SESSION_DAYS = positiveNumber(process.env.PORTAL_SESSION_DAYS, 30);
export const PORTAL_MAGIC_LINK_MINUTES = positiveNumber(process.env.PORTAL_MAGIC_LINK_MINUTES, 20);
export const NOTIFICATION_WORKER_INTERVAL_MS = positiveNumber(process.env.NOTIFICATION_WORKER_INTERVAL_MS, 5000, 1000);
export const NOTIFICATION_MAX_ATTEMPTS = positiveNumber(process.env.NOTIFICATION_MAX_ATTEMPTS, 5);
export const RETENTION_SWEEP_INTERVAL_MS = positiveNumber(process.env.RETENTION_SWEEP_INTERVAL_MS, 5 * 60 * 1000, 60 * 1000);
export const COMMUNICATIONS_CRON_SECRET: string | undefined = process.env.COMMUNICATIONS_CRON_SECRET;
export const SMS_PROVIDER = (process.env.SMS_PROVIDER || "disabled").toLowerCase();
export const SMS_WEBHOOK_URL: string | undefined = process.env.SMS_WEBHOOK_URL;
export const SMS_WEBHOOK_TOKEN: string | undefined = process.env.SMS_WEBHOOK_TOKEN;
export const PUBLIC_REVIEW_URL: string | undefined = process.env.PUBLIC_REVIEW_URL;
export const WEBSITE_PREVIEW_TTL_MINUTES = positiveNumber(process.env.WEBSITE_PREVIEW_TTL_MINUTES, 30, 5);

export const AUDIT_LOG_RETENTION_DAYS = positiveNumber(process.env.AUDIT_LOG_RETENTION_DAYS, 180, 7);
export const MEDIA_WORKER_INTERVAL_MS = positiveNumber(process.env.MEDIA_WORKER_INTERVAL_MS, 10_000, 1_000);
export const ERROR_REPORTING_WEBHOOK_URL: string | undefined = process.env.ERROR_REPORTING_WEBHOOK_URL;
export const BACKUP_RETENTION_DAYS = positiveNumber(process.env.BACKUP_RETENTION_DAYS, 14, 1);
export const HEALTH_SECRET: string | undefined = process.env.HEALTH_SECRET;
export const APP_RELEASE: string = process.env.APP_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || "development";
export const CSP_REPORT_URI: string | undefined = process.env.CSP_REPORT_URI;

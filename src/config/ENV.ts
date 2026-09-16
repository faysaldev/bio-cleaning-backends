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
export const FRONTEND_URL: string | undefined = process.env.FRONTEND_URL;
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

export const REDIS_URL: string | undefined = process.env.REDIS_URL;
export const REDIS_HOST: string | undefined = process.env.REDIS_HOST;
export const REDIS_PORT: string | undefined = process.env.REDIS_PORT;
export const REDIS_PASSWORD: string | undefined = process.env.REDIS_PASSWORD;
export const REDIS_DB: string | undefined = process.env.REDIS_DB;

export const CLOUDINARY_CLOUD_NAME: string | undefined =
  process.env.CLOUDINARY_CLOUD_NAME;
export const CLOUDINARY_API_KEY: string | undefined =
  process.env.CLOUDINARY_API_KEY;
export const CLOUDINARY_API_SECRET: string | undefined =
  process.env.CLOUDINARY_API_SECRET;
export const CRYPTO_SECRET_KEY: string | undefined =
  process.env.CRYPTO_SECRET_KEY;

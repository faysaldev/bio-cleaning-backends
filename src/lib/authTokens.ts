import crypto from "crypto";
import { Request, Response, CookieOptions } from "express";
import jwt from "jsonwebtoken";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  COOKIE_DOMAIN,
  COOKIE_SAME_SITE,
  COOKIE_SECURE,
  JWT_REFRESH_SECRET,
  JWT_SECRET,
} from "../config/ENV";

export const ACCESS_COOKIE_NAME = "bio_access";
export const REFRESH_COOKIE_NAME = "bio_refresh";

export type AccessTokenPayload = {
  tokenType: "access";
  userId: string;
  sessionId: string;
  role: "admin" | "user";
};

export type RefreshTokenPayload = {
  tokenType: "refresh";
  userId: string;
  sessionId: string;
};

const assertAuthSecrets = () => {
  if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    throw new Error("JWT_SECRET and JWT_REFRESH_SECRET must be configured");
  }
  if (process.env.NODE_ENV === "production" && (JWT_SECRET.length < 32 || JWT_REFRESH_SECRET.length < 32)) {
    throw new Error("JWT_SECRET and JWT_REFRESH_SECRET must each be at least 32 characters in production");
  }
};

export const hashToken = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

export const generateCsrfToken = () => crypto.randomBytes(32).toString("hex");

export const signAccessToken = (payload: Omit<AccessTokenPayload, "tokenType">) => {
  assertAuthSecrets();
  return jwt.sign({ ...payload, tokenType: "access" }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });
};

export const signRefreshToken = (
  payload: Omit<RefreshTokenPayload, "tokenType">,
  ttlSeconds: number,
) => {
  assertAuthSecrets();
  return jwt.sign({ ...payload, tokenType: "refresh" }, JWT_REFRESH_SECRET, {
    expiresIn: ttlSeconds,
  });
};

export const verifyAccessToken = (token: string) => {
  assertAuthSecrets();
  return jwt.verify(token, JWT_SECRET) as AccessTokenPayload;
};

export const verifyRefreshToken = (token: string) => {
  assertAuthSecrets();
  return jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload;
};

export const getCookie = (req: Request, name: string): string | undefined => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;

  for (const entry of cookieHeader.split(";")) {
    const separator = entry.indexOf("=");
    if (separator === -1) continue;
    const key = entry.slice(0, separator).trim();
    if (key !== name) continue;
    return decodeURIComponent(entry.slice(separator + 1).trim());
  }
  return undefined;
};

const commonCookieOptions = (): CookieOptions => ({
  secure: COOKIE_SECURE,
  sameSite: COOKIE_SAME_SITE,
  domain: COOKIE_DOMAIN,
  path: "/",
});

export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
  refreshTtlSeconds: number,
) => {
  const common = commonCookieOptions();

  res.cookie(ACCESS_COOKIE_NAME, accessToken, {
    ...common,
    httpOnly: true,
    maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
  });

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...common,
    httpOnly: true,
    maxAge: refreshTtlSeconds * 1000,
  });
};

export const clearAuthCookies = (res: Response) => {
  const common = commonCookieOptions();
  res.clearCookie(ACCESS_COOKIE_NAME, { ...common, httpOnly: true });
  res.clearCookie(REFRESH_COOKIE_NAME, { ...common, httpOnly: true });
};

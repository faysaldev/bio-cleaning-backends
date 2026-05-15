import dotenv from "dotenv";
dotenv.config({ quiet: true });
export const BACKEND_IP: string = process.env.BACKEND_IP as string;
export const PORT: number = parseInt(process.env.PORT as string, 10);
export const SOCKET_PORT: number = parseInt(
  process.env.SOCKET_PORT as string,
  10,
);
export const DATABASE_URL: string = process.env.DATABASE_URL as string;
export const JWT_SECRET: string = process.env.JWT_SECRET as string;
export const JWT_EXPIRE_TIME: number = parseInt(
  process.env.JWT_EXPIRE_TIME as string,
  10,
);
export const JWT_REFRESH_SECRET: string = process.env
  .JWT_REFRESH_SECRET as string;
export const EMAIL_USERNAME: string = process.env.EMAIL_USERNAME as string;
export const EMAIL_PASSWORD: string = process.env.EMAIL_PASSWORD as string;
export const STRIPE_SECRET_KEY: string = process.env
  .STRIPE_SECRET_KEY as string;
export const FRONTEND_URL: string | undefined = process.env.FRONTEND_URL; // Optional, so it can be undefined

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

// crypto secret key
export const CRYPTO_SECRET_KEY: string | undefined =
  process.env.CRYPTO_SECRET_KEY;

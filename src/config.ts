import dotenv from "dotenv";
dotenv.config();

export const config = {
  PORT: process.env.PORT ? Number(process.env.PORT) : 4000,
  HOST: process.env.HOST || "0.0.0.0",
  API_PREFIX: process.env.API_PREFIX || "api/v1",
  DATABASE_HOST: process.env.DATABASE_HOST || "",
  DATABASE_PORT: process.env.DATABASE_PORT
    ? Number(process.env.DATABASE_PORT)
    : undefined,
  DATABASE_USERNAME: process.env.DATABASE_USERNAME || "",
  DATABASE_PASSWORD: process.env.DATABASE_PASSWORD || "",
  DATABASE_NAME: process.env.DATABASE_NAME || "",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  METRICS_PREFIX: process.env.METRICS_PREFIX || "app_",
  COOKIE_NAME: process.env.COOKIE_NAME || "session",
  JWT_SECRET: process.env.JWT_SECRET,
};

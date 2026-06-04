import { randomBytes } from "node:crypto";
import dotenv from "dotenv";
import { logger } from "./logger";

dotenv.config();

const apiKey = process.env.WEATHER_AI_KEY || "";
if (!apiKey) {
  logger.warn("WEATHER_AI_KEY missing — WeatherAI calls will fail until it is set.");
}

let jwtSecret = process.env.JWT_SECRET || "";
if (!jwtSecret) {
  jwtSecret = randomBytes(32).toString("hex");
  logger.warn("JWT_SECRET missing — using an ephemeral secret.");
}

export const env = {
  apiKey,
  baseUrl: (process.env.WEATHER_AI_BASE_URL || "https://api.weather-ai.co").replace(/\/$/, ""),
  port: Number(process.env.PORT || 8080),
  nodeEnv: process.env.NODE_ENV || "development",

  cacheDriver: process.env.CACHE_DRIVER === "redis" ? "redis" : "memory",
  redisUrl: process.env.REDIS_URL || "",

  mongoUrl: process.env.MONGO_URL || "",

  jwtSecret,
  cookieSecure: process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",

  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  rateLimitPublicMax: Number(process.env.RATE_LIMIT_PUBLIC_MAX || 15),
  rateLimitAuthMax: Number(process.env.RATE_LIMIT_AUTH_MAX || 30),
} as const;

export const hasApiKey = () => Boolean(env.apiKey);
export const hasMongo = () => Boolean(env.mongoUrl);
/** Redis is used only when explicitly selected AND a URL is provided. */
export const useRedis = () => env.cacheDriver === "redis" && Boolean(env.redisUrl);

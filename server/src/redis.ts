import Redis from "ioredis";
import { env, useRedis } from "./env";
import { logger } from "./logger";

let client: Redis | null = null;

// Single shared ioredis connection, reused by both the cache store and the
// rate limiter. Returns null when Redis isn't configured (→ in-memory fallback).
export function getRedis(): Redis | null {
  if (!useRedis()) return null;
  if (!client) {
    client = new Redis(env.redisUrl, { maxRetriesPerRequest: 2 });
    client.on("error", (e) => logger.error({ err: e.message }, "redis:error"));
    client.on("connect", () => logger.info("redis:connected"));
  }
  return client;
}

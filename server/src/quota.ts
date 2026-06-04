import { getRedis } from "./redis";

/**
 * Tracks the WeatherAI rate-limit headers (X-RateLimit-Limit/Remaining/Reset) plus
 * upstream-vs-cache call counts (how much the cache saves). Backed by Redis when
 * CACHE_DRIVER=redis, else in-memory.
 */

export interface QuotaSnapshot {
  limit: number | null;
  remaining: number | null;
  resetAt: string | null; // ISO timestamp
  updatedAt: string | null;
}

export interface QuotaStats {
  rateLimit: QuotaSnapshot;
  upstreamCalls: number; // requests that actually hit WeatherAI
  cacheHits: number; // requests served from our cache (quota saved)
  cacheHitRate: number; // 0..1
}

const K_RATELIMIT = "quota:ratelimit";
const K_UPSTREAM = "quota:upstreamCalls";
const K_CACHE_HITS = "quota:cacheHits";

let snapshot: QuotaSnapshot = { limit: null, remaining: null, resetAt: null, updatedAt: null };
let upstreamCalls = 0;
let cacheHits = 0;

function parseHeaderInt(headers: Headers, name: string): number | null {
  const raw = headers.get(name);
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function recordRateLimit(headers: Headers, now: number): void {
  const limit = parseHeaderInt(headers, "x-ratelimit-limit");
  const remaining = parseHeaderInt(headers, "x-ratelimit-remaining");
  const resetEpoch = parseHeaderInt(headers, "x-ratelimit-reset");
  const resetAt = resetEpoch != null ? new Date(resetEpoch * 1000).toISOString() : null;
  const updatedAt = new Date(now).toISOString();

  const redis = getRedis();
  if (redis) {
    // Only set fields that are present, so last-known values survive a header gap.
    const fields: Record<string, string> = { updatedAt };
    if (limit != null) fields.limit = String(limit);
    if (remaining != null) fields.remaining = String(remaining);
    if (resetAt != null) fields.resetAt = resetAt;
    redis.hset(K_RATELIMIT, fields).catch(() => {});
    return;
  }

  snapshot = {
    limit: limit ?? snapshot.limit,
    remaining: remaining ?? snapshot.remaining,
    resetAt: resetAt ?? snapshot.resetAt,
    updatedAt,
  };
}

export function recordUpstreamCall(): void {
  const redis = getRedis();
  if (redis) redis.incr(K_UPSTREAM).catch(() => {});
  else upstreamCalls += 1;
}

export function recordCacheHit(): void {
  const redis = getRedis();
  if (redis) redis.incr(K_CACHE_HITS).catch(() => {});
  else cacheHits += 1;
}

function buildStats(rateLimit: QuotaSnapshot, up: number, hit: number): QuotaStats {
  const total = up + hit;
  return { rateLimit, upstreamCalls: up, cacheHits: hit, cacheHitRate: total === 0 ? 0 : hit / total };
}

export async function getStats(): Promise<QuotaStats> {
  const redis = getRedis();
  if (redis) {
    const [snap, up, hit] = await Promise.all([
      redis.hgetall(K_RATELIMIT),
      redis.get(K_UPSTREAM),
      redis.get(K_CACHE_HITS),
    ]);
    const rateLimit: QuotaSnapshot = {
      limit: snap.limit ? Number(snap.limit) : null,
      remaining: snap.remaining ? Number(snap.remaining) : null,
      resetAt: snap.resetAt || null,
      updatedAt: snap.updatedAt || null,
    };
    return buildStats(rateLimit, Number(up || 0), Number(hit || 0));
  }
  return buildStats(snapshot, upstreamCalls, cacheHits);
}

import { getRedis } from "./redis";
import { getLogger } from "./requestContext";

const inflight = new Map<string, Promise<unknown>>();

const LOCK_TTL_MS = 10_000;
const POLL_INTERVAL_MS = 50;
const POLL_TIMEOUT_MS = 3_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRedisLock<T>(
  key: string,
  compute: () => Promise<T>,
  readCache: () => Promise<T | null>,
): Promise<T> {
  const redis = getRedis()!;
  const lockKey = `sf:${key}`;
  const acquired = await redis.set(lockKey, "1", "PX", LOCK_TTL_MS, "NX");

  if (acquired === "OK") {
    try {
      return await compute();
    } finally {
      await redis.del(lockKey).catch(() => {});
    }
  }

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const cached = await readCache();
    if (cached !== null) return cached;
    if (!(await redis.exists(lockKey))) break;
  }
  return compute();
}

export function coalesce<T>(
  key: string,
  compute: () => Promise<T>,
  readCache: () => Promise<T | null>,
): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) {
    getLogger().debug({ key }, "coalesced:local");
    return existing;
  }
  // Double-checked locking: after winning the leader slot, re-read the cache —
  // another worker may have populated it between our miss and now (in-process, or
  // a Redis lock just released). Avoids a redundant upstream call.
  const guardedCompute = async (): Promise<T> => {
    const hit = await readCache();
    if (hit !== null) {
      getLogger().debug({ key }, "coalesced:cache");
      return hit;
    }
    return compute();
  };
  const run = getRedis() ? withRedisLock(key, guardedCompute, readCache) : guardedCompute();
  const p = run.finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

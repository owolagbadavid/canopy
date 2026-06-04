import { getRedis } from "./redis";
import { logger } from "./logger";

export interface CacheStore {
  readonly driver: "memory" | "redis";
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
  ping(): Promise<boolean>;
}

interface Entry {
  value: unknown;
  expiresAt: number;
}

/**
 * In-memory TTL + LRU store. The default driver; conserves the tight WeatherAI
 * free quota by serving repeated views without hitting upstream.
 */
class MemoryCacheStore implements CacheStore {
  readonly driver = "memory" as const;
  private store = new Map<string, Entry>();

  constructor(private readonly maxEntries = 500) {}

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    this.store.delete(key);
    this.store.set(key, entry); // refresh recency (insertion order = LRU)
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  async ping(): Promise<boolean> {
    return true;
  }
}

/** Redis-backed store for multi-instance deploys. Values are JSON-serialized. */
class RedisCacheStore implements CacheStore {
  readonly driver = "redis" as const;
  constructor(private readonly client = getRedis()!) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    return raw == null ? null : (JSON.parse(raw) as T);
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), "PX", ttlMs);
  }

  async ping(): Promise<boolean> {
    try {
      return (await this.client.ping()) === "PONG";
    } catch {
      return false;
    }
  }
}

function createCache(): CacheStore {
  if (getRedis()) {
    logger.info("cache:driver redis");
    return new RedisCacheStore();
  }
  logger.info("cache:driver memory");
  return new MemoryCacheStore();
}

export const cache: CacheStore = createCache();

/** Round coordinates so nearby requests share a cache entry (~110m at 3 decimals). */
export function coordKey(lat: number, lon: number, precision = 3): string {
  return `${lat.toFixed(precision)},${lon.toFixed(precision)}`;
}

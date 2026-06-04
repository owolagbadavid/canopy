import express from "express";
import cookieParser from "cookie-parser";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import type { Request } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { env, hasMongo } from "./env";
import { logger } from "./logger";
import { httpLogger } from "./middleware/httpLogger";
import { cache } from "./cache";
import { getRedis } from "./redis";
import { connectMongo, pingMongo } from "./db";
import { register } from "./metrics";
import { SESSION_COOKIE, verifySession } from "./auth";
import { RATE_LIMIT_OVERRIDES } from "./rateLimits";
import authRoutes from "./routes/auth";
import weatherRoutes from "./routes/weather";
import treesRoutes from "./routes/trees";
import metaRoutes from "./routes/meta";
import locationRoutes from "./routes/locations";
import analysisRoutes from "./routes/analyses";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set("trust proxy", 1);

app.use(httpLogger);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/ready", async (_req, res) => {
  const [cacheOk, mongoOk] = await Promise.all([cache.ping().catch(() => false), pingMongo()]);
  const ready = cacheOk && (!hasMongo() || mongoOk);
  res.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "not_ready",
    checks: {
      cache: { driver: cache.driver, ok: cacheOk },
      mongo: { configured: hasMongo(), ok: mongoOk },
    },
  });
});

app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

const sessionFromReq = (req: Request) => {
  const token = req.cookies?.[SESSION_COOKIE];
  return token ? verifySession(token) : null;
};

const endpointKey = (req: Request) => {
  const path = `${req.baseUrl}${req.path}`.replace(/\/[0-9a-f]{24}(?=\/|$)/gi, "/:id");
  return `${req.method} ${path}`;
};
const limiterRedis = getRedis();
const limiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: (req) => {
    const override = RATE_LIMIT_OVERRIDES[endpointKey(req)] ?? {};
    return sessionFromReq(req)
      ? (override.auth ?? env.rateLimitAuthMax)
      : (override.public ?? env.rateLimitPublicMax);
  },
  keyGenerator: (req) => {
    const user = sessionFromReq(req);
    const id = user ? `user:${user.id}` : ipKeyGenerator(req.ip ?? "");
    return `${id}|${endpointKey(req)}`;
  },
  standardHeaders: "draft-7",
  legacyHeaders: false,
  ...(limiterRedis
    ? {
        store: new RedisStore({
          sendCommand: (...args: string[]) =>
            limiterRedis.call(args[0] as string, ...args.slice(1)) as Promise<never>,
        }),
      }
    : {}),
});
app.use("/api", limiter);

// --- API ---
app.use("/api", authRoutes);
app.use("/api", metaRoutes);
app.use("/api", weatherRoutes);
app.use("/api", treesRoutes);
app.use("/api", locationRoutes);
app.use("/api", analysisRoutes);

// --- Static frontend ---
const webDist = path.resolve(__dirname, "../../web/dist");
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(webDist, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res.type("text").send("Canopy API is running. Build the web app to serve the dashboard.");
  });
}

async function start(): Promise<void> {
  try {
    await connectMongo();
  } catch (err) {
    logger.error({ err: (err as Error).message }, "mongo:connect:failed");
  }
  app.listen(env.port, () => {
    logger.info({ port: env.port, env: env.nodeEnv, cache: cache.driver, mongo: hasMongo() }, "canopy:listening");
  });
}

void start();

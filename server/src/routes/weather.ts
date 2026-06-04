import { Router, type Request, type Response } from "express";
import { getJson, WeatherApiError } from "../weatherClient";
import { adaptWeather } from "../adapter";
import { cache, coordKey } from "../cache";
import { coalesce } from "../coalesce";
import { recordCacheHit } from "../quota";
import { recordCache } from "../metrics";
import { getLogger } from "../requestContext";

const router = Router();

const TTL_MS = 10 * 60 * 1000; // 10 minutes

function parseCoords(req: Request): { lat: number; lon: number } | null {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

function handleError(res: Response, err: unknown): void {
  if (err instanceof WeatherApiError) {
    res.status(err.status).json({ error: err.message, status: err.status });
    return;
  }
  getLogger().error({ err: (err as Error).message }, "weather:unexpected");
  res.status(500).json({ error: "Unexpected server error" });
}

router.get("/weather", async (req, res) => {
  const coords = parseCoords(req);
  if (!coords) {
    res.status(400).json({ error: "Valid 'lat' and 'lon' query params are required." });
    return;
  }

  const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 7);
  const units = req.query.units === "imperial" ? "imperial" : "metric";
  const lang = typeof req.query.lang === "string" ? req.query.lang : "en";
  const ai = req.query.ai === "false" ? false : true;

  const key = `weather|${coordKey(coords.lat, coords.lon)}|${days}|${units}|${lang}|ai=${ai}`;
  const cached = await cache.get<ReturnType<typeof adaptWeather>>(key);
  if (cached) {
    recordCache("hit");
    recordCacheHit();
    res.json({ ...cached, meta: { ...cached.meta, cached: true } });
    return;
  }
  recordCache("miss");

  try {
    const model = await coalesce(
      key,
      async () => {
        const raw = await getJson("/v1/weather", {
          lat: coords.lat,
          lon: coords.lon,
          days,
          units,
          lang,
          ai,
        });
        const m = adaptWeather(raw, {
          temperature: units === "imperial" ? "°F" : "°C",
          wind: units === "imperial" ? "mph" : "km/h",
        });
        await cache.set(key, m, TTL_MS);
        return m;
      },
      () => cache.get<ReturnType<typeof adaptWeather>>(key),
    );
    res.json(model);
  } catch (err) {
    handleError(res, err);
  }
});

export default router;

import type {
  CurrentConditions,
  DailyForecast,
  HourlyForecast,
  TreeAnalysis,
  WeatherModel,
} from "./types";
import { wmoLabel } from "./wmo";
import { deriveRisks } from "./risk";

/* Null-safe coercion helpers — these only guard against missing values or wrong
   types, not field renaming. Field names below match the documented WeatherAI
   response shape exactly. */
function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null; // don't coerce null → 0
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function str(v: unknown): string | null {
  return v == null ? null : String(v);
}

function mapCurrent(raw: Record<string, unknown>): CurrentConditions {
  const code = str(raw.condition_code) ?? "";
  return {
    time: str(raw.time) ?? "",
    temperature: num(raw.temperature) ?? 0,
    feelsLike: num(raw.feels_like),
    humidity: num(raw.humidity),
    windSpeed: num(raw.wind_speed) ?? 0,
    windDirection: num(raw.wind_direction),
    windGust: num(raw.wind_gust),
    uvIndex: num(raw.uv_index),
    conditionCode: code,
    conditionLabel: wmoLabel(code),
    icon: str(raw.icon),
  };
}

function mapDaily(raw: unknown): DailyForecast[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const d = obj(entry);
    const code = str(d.condition_code) ?? "";
    return {
      date: str(d.date) ?? "",
      tempMin: num(d.temp_min) ?? 0,
      tempMax: num(d.temp_max) ?? 0,
      precipitationSum: num(d.precipitation_sum) ?? 0,
      precipitationProbability: num(d.precipitation_probability),
      windMax: num(d.wind_max),
      sunrise: str(d.sunrise),
      sunset: str(d.sunset),
      conditionCode: code,
      conditionLabel: wmoLabel(code),
      icon: str(d.icon),
    };
  });
}

function mapHourly(raw: unknown): HourlyForecast[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const h = obj(entry);
    const code = str(h.condition_code) ?? "";
    return {
      time: str(h.time) ?? "",
      temperature: num(h.temperature) ?? 0,
      precipitationProbability: num(h.precipitation_probability),
      windSpeed: num(h.wind_speed) ?? 0,
      windGust: num(h.wind_gust),
      humidity: num(h.humidity),
      uvIndex: num(h.uv_index),
      conditionCode: code,
      conditionLabel: wmoLabel(code),
      icon: str(h.icon),
    };
  });
}

export function adaptWeather(rawInput: unknown, units: { temperature: string; wind: string }): WeatherModel {
  const root = obj(rawInput);
  const location = obj(root.location);
  const current = mapCurrent(obj(root.current));
  const daily = mapDaily(root.daily);
  const hourly = mapHourly(root.hourly);

  return {
    location: {
      lat: num(location.lat) ?? 0,
      lon: num(location.lon) ?? 0,
      timezone: str(location.timezone),
      country: str(location.country),
    },
    units,
    current,
    daily,
    hourly,
    aiSummary: str(root.ai_summary),
    risks: deriveRisks(current, daily, hourly),
    meta: { cached: false, fetchedAt: new Date().toISOString() },
  };
}

export function adaptTreeAnalysis(rawInput: unknown, source: "live" | "sample"): TreeAnalysis {
  const r = obj(rawInput);
  const health = obj(r.tree_health);
  const toStrArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)) : [];

  return {
    analysisId: str(r.analysis_id),
    timestamp: str(r.timestamp),
    totalTreeCount: num(r.total_tree_count),
    treeDensityPerAcre: num(r.tree_density_per_acre),
    confidenceScore: num(r.confidence_score),
    canopyCoveragePct: num(r.canopy_coverage_pct),
    treeHealth: {
      healthy: num(health.healthy),
      needsCare: num(health.needs_care),
      needsReplacement: num(health.needs_replacement),
    },
    observations: toStrArray(r.observations),
    recommendations: toStrArray(r.recommendations),
    overlayImageUrl: str(r.overlay_image_url),
    originalImageUrl: str(r.original_image_url),
    lowConfidence: r.low_confidence === true,
    geminiError: str(r.gemini_error),
    source,
  };
}

import type { CurrentConditions, DailyForecast, HourlyForecast, RiskFlag } from "./types";
import { isWetCode } from "./wmo";

const FROST_C = 2;
const HEAVY_RAIN_MM = 20; 
const HIGH_RAIN_PROB = 70; 
const HIGH_WIND_KMH = 40;
const STRONG_GUST_KMH = 55;
const HIGH_UV = 8;

export function deriveRisks(
  current: CurrentConditions,
  daily: DailyForecast[],
  hourly: HourlyForecast[],
): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const window = daily.slice(0, 3);

  const coldest = window.reduce<DailyForecast | null>(
    (acc, d) => (acc == null || d.tempMin < acc.tempMin ? d : acc),
    null,
  );
  if (coldest && coldest.tempMin <= FROST_C) {
    flags.push({
      kind: "frost",
      level: coldest.tempMin <= 0 ? "warning" : "watch",
      title: "Frost risk",
      detail: `Low of ${coldest.tempMin.toFixed(1)}°C expected on ${coldest.date}. Protect sensitive crops.`,
    });
  }

  const wetDay = window.find(
    (d) =>
      d.precipitationSum >= HEAVY_RAIN_MM ||
      ((d.precipitationProbability ?? 0) >= HIGH_RAIN_PROB && isWetCode(d.conditionCode)),
  );
  if (wetDay) {
    flags.push({
      kind: "heavy_rain",
      level: wetDay.precipitationSum >= HEAVY_RAIN_MM ? "warning" : "watch",
      title: "Heavy rain",
      detail: `${wetDay.precipitationSum.toFixed(1)} mm / ${wetDay.precipitationProbability ?? "?"}% chance on ${wetDay.date}. Watch for waterlogging.`,
    });
  }

  const maxWind = Math.max(
    current.windSpeed,
    ...window.map((d) => d.windMax ?? 0),
  );
  const maxGust = Math.max(
    current.windGust ?? 0,
    ...hourly.slice(0, 24).map((h) => h.windGust ?? 0),
  );
  if (maxWind >= HIGH_WIND_KMH || maxGust >= STRONG_GUST_KMH) {
    flags.push({
      kind: "high_wind",
      level: maxGust >= STRONG_GUST_KMH ? "warning" : "watch",
      title: "Strong wind",
      detail: `Winds up to ${maxWind.toFixed(0)} km/h (gusts ${maxGust.toFixed(0)} km/h). Risk of fruit drop and limb damage.`,
    });
  }

  const maxUv = Math.max(
    current.uvIndex ?? 0,
    ...hourly.slice(0, 24).map((h) => h.uvIndex ?? 0),
  );
  if (maxUv >= HIGH_UV) {
    flags.push({
      kind: "high_uv",
      level: "info",
      title: "High UV",
      detail: `UV index peaks near ${maxUv.toFixed(0)}. Consider sun protection for workers and young plants.`,
    });
  }

  return flags;
}

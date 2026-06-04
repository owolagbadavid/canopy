/**
 * Our normalized domain model. The frontend depends ONLY on these shapes, never
 * on the raw WeatherAI payload, so upstream field churn is absorbed in adapter.ts.
 */

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface CurrentConditions {
  time: string;
  temperature: number;
  feelsLike: number | null;
  humidity: number | null;
  windSpeed: number;
  windDirection: number | null;
  windGust: number | null;
  uvIndex: number | null;
  conditionCode: string;
  conditionLabel: string;
  icon: string | null;
}

export interface DailyForecast {
  date: string;
  tempMin: number;
  tempMax: number;
  precipitationSum: number;
  precipitationProbability: number | null;
  windMax: number | null;
  sunrise: string | null;
  sunset: string | null;
  conditionCode: string;
  conditionLabel: string;
  icon: string | null;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  precipitationProbability: number | null;
  windSpeed: number;
  windGust: number | null;
  humidity: number | null;
  uvIndex: number | null;
  conditionCode: string;
  conditionLabel: string;
  icon: string | null;
}

export type RiskLevel = "info" | "watch" | "warning";

export interface RiskFlag {
  kind: "frost" | "heavy_rain" | "high_wind" | "high_uv";
  level: RiskLevel;
  title: string;
  detail: string;
}

export interface WeatherModel {
  location: {
    lat: number;
    lon: number;
    timezone: string | null;
    country: string | null;
  };
  units: { temperature: string; wind: string };
  current: CurrentConditions;
  daily: DailyForecast[];
  hourly: HourlyForecast[];
  aiSummary: string | null;
  risks: RiskFlag[];
  meta: {
    cached: boolean;
    fetchedAt: string;
  };
}

export interface TreeAnalysis {
  analysisId: string | null;
  timestamp: string | null;
  totalTreeCount: number | null;
  treeDensityPerAcre: number | null;
  confidenceScore: number | null;
  canopyCoveragePct: number | null;
  treeHealth: {
    healthy: number | null;
    needsCare: number | null;
    needsReplacement: number | null;
  };
  observations: string[];
  recommendations: string[];
  overlayImageUrl: string | null;
  originalImageUrl: string | null;
  // CV flagged the image as too low-confidence to count crowns (e.g. not an aerial shot).
  lowConfidence: boolean;
  // Upstream Gemini error, if the AI step failed (observations/recommendations will be empty).
  geminiError: string | null;
  source: "live" | "sample"; // sample = served from bundled fallback (quota exhausted)
}

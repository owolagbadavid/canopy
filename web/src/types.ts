// Mirrors the normalized model the server returns (server/src/types.ts).

export interface RiskFlag {
  kind: "frost" | "heavy_rain" | "high_wind" | "high_uv";
  level: "info" | "watch" | "warning";
  title: string;
  detail: string;
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

export interface WeatherModel {
  location: { lat: number; lon: number; timezone: string | null; country: string | null };
  units: { temperature: string; wind: string };
  current: CurrentConditions;
  daily: DailyForecast[];
  hourly: unknown[];
  aiSummary: string | null;
  risks: RiskFlag[];
  meta: { cached: boolean; fetchedAt: string };
}

export interface TreeAnalysis {
  analysisId: string | null;
  timestamp: string | null;
  totalTreeCount: number | null;
  treeDensityPerAcre: number | null;
  confidenceScore: number | null;
  canopyCoveragePct: number | null;
  treeHealth: { healthy: number | null; needsCare: number | null; needsReplacement: number | null };
  observations: string[];
  recommendations: string[];
  overlayImageUrl: string | null;
  originalImageUrl: string | null;
  lowConfidence: boolean;
  geminiError: string | null;
  source: "live" | "sample";
  meta?: { cached: boolean; fallbackReason?: string };
}

export interface User {
  id: string;
  email: string;
}

export interface SavedLocation {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface AnalysisHistoryItem {
  id: string;
  createdAt: string;
  totalTreeCount: number | null;
  treeDensityPerAcre: number | null;
  canopyCoveragePct: number | null;
  confidenceScore: number | null;
  source: "live" | "sample";
}

export interface QuotaStats {
  rateLimit: {
    limit: number | null;
    remaining: number | null;
    resetAt: string | null;
    updatedAt: string | null;
  };
  upstreamCalls: number;
  cacheHits: number;
  cacheHitRate: number;
}

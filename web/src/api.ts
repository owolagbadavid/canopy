import type {
  AnalysisHistoryItem,
  QuotaStats,
  SavedLocation,
  TreeAnalysis,
  User,
  WeatherModel,
} from "./types";

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

async function asJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) onUnauthorized?.();
    const message = (data as { error?: string }).error || `Request failed (${res.status})`;
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data as T;
}

const json = (extra: RequestInit = {}): RequestInit => ({ credentials: "include", ...extra });

// --- auth ---
export async function getMe(): Promise<User | null> {
  const res = await fetch("/api/auth/me", json());
  if (res.status === 401) return null;
  return (await asJson<{ user: User }>(res)).user;
}

export async function login(email: string): Promise<User> {
  const res = await fetch(
    "/api/auth/login",
    json({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }),
  );
  return (await asJson<{ user: User }>(res)).user;
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", json({ method: "POST" }));
}

// --- weather / trees ---
export interface WeatherParams {
  lat: number;
  lon: number;
  units?: "metric" | "imperial";
  ai?: boolean;
}

export async function fetchWeather({ lat, lon, units = "metric", ai = true }: WeatherParams): Promise<WeatherModel> {
  const qs = new URLSearchParams({ lat: String(lat), lon: String(lon), units, ai: String(ai) });
  return asJson<WeatherModel>(await fetch(`/api/weather?${qs}`, json()));
}

export async function analyzeTrees(file: File, fields: Record<string, string> = {}): Promise<TreeAnalysis> {
  const form = new FormData();
  form.append("image", file);
  for (const [k, v] of Object.entries(fields)) if (v) form.append(k, v);
  return asJson<TreeAnalysis>(await fetch("/api/trees/analyze", json({ method: "POST", body: form })));
}

export async function fetchQuota(): Promise<QuotaStats> {
  return asJson<QuotaStats>(await fetch("/api/quota", json()));
}

// --- saved locations ---
export async function listLocations(): Promise<SavedLocation[]> {
  return asJson<SavedLocation[]>(await fetch("/api/locations", json()));
}

export async function saveLocation(loc: { name: string; lat: number; lon: number }): Promise<SavedLocation> {
  return asJson<SavedLocation>(
    await fetch("/api/locations", json({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(loc) })),
  );
}

export async function deleteLocation(id: string): Promise<void> {
  await fetch(`/api/locations/${id}`, json({ method: "DELETE" }));
}

// --- analysis history ---
export async function listAnalyses(): Promise<AnalysisHistoryItem[]> {
  return asJson<AnalysisHistoryItem[]>(await fetch("/api/analyses", json()));
}

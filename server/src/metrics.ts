import client from "prom-client";

export const register = new client.Registry();
client.collectDefaultMetrics({ register });

const cacheRequests = new client.Counter({
  name: "canopy_cache_requests_total",
  help: "Cache lookups by result",
  labelNames: ["result"] as const, // hit | miss
  registers: [register],
});

const upstreamDuration = new client.Histogram({
  name: "canopy_upstream_request_duration_seconds",
  help: "Latency of calls to the WeatherAI upstream API",
  labelNames: ["url", "status"] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

const httpRequests = new client.Counter({
  name: "canopy_http_requests_total",
  help: "HTTP requests handled",
  labelNames: ["method", "route", "status"] as const,
  registers: [register],
});

const httpDuration = new client.Histogram({
  name: "canopy_http_request_duration_seconds",
  help: "HTTP request duration",
  labelNames: ["method", "route", "status"] as const,
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register],
});

export function recordCache(result: "hit" | "miss"): void {
  cacheRequests.inc({ result });
}

export function recordUpstream(url: string, status: number, seconds: number): void {
  upstreamDuration.observe({ url, status: String(status) }, seconds);
}

export function recordHttp(method: string, route: string, status: number, seconds: number): void {
  const labels = { method, route, status: String(status) };
  httpRequests.inc(labels);
  httpDuration.observe(labels, seconds);
}

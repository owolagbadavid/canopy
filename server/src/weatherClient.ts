import { env, hasApiKey } from "./env";
import { recordRateLimit, recordUpstreamCall } from "./quota";
import { recordUpstream } from "./metrics";
import { getLogger } from "./requestContext";

export class WeatherApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly upstreamBody?: unknown,
  ) {
    super(message);
    this.name = "WeatherApiError";
  }
}

function authHeaders(): Record<string, string> {
  if (!hasApiKey()) {
    throw new WeatherApiError("Server is missing WEATHER_AI_KEY", 503);
  }
  return { Authorization: `Bearer ${env.apiKey}` };
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function mapError(status: number, body: unknown): WeatherApiError {
  const messages: Record<number, string> = {
    400: "Invalid request to the weather service.",
    401: "Weather service rejected the API key (401).",
    403: "This feature is not available on the current plan (403).",
    429: "Monthly quota exceeded for the weather service (429).",
    500: "The weather service had an internal error.",
    503: "The weather service is temporarily unavailable.",
  };
  const fromBody =
    body && typeof body === "object" && "message" in body
      ? String((body as Record<string, unknown>).message)
      : undefined;
  return new WeatherApiError(fromBody || messages[status] || `Weather service error (${status})`, status, body);
}

// One place that talks to upstream: records the call, latency, status, rate-limit
// headers, and a structured log line carrying the request correlation id.
async function call(url: string | URL, init?: RequestInit): Promise<unknown> {
  const log = getLogger();
  const u = new URL(url);
  const target = `${u.origin}${u.pathname}`; // metric label: host + path, query stripped
  const start = process.hrtime.bigint();
  recordUpstreamCall();
  try {
    const res = await fetch(url, init);
    const seconds = Number(process.hrtime.bigint() - start) / 1e9;
    recordRateLimit(res.headers, Date.now());
    recordUpstream(target, res.status, seconds);
    log.info({ url: u.href, status: res.status, durationMs: Math.round(seconds * 1000) }, "upstream:weatherai");

    const body = await readBody(res);
    if (!res.ok) throw mapError(res.status, body);
    return body;
  } catch (err) {
    if (err instanceof WeatherApiError) throw err;
    const seconds = Number(process.hrtime.bigint() - start) / 1e9;
    recordUpstream(target, 0, seconds);
    log.error({ url: u.href, err: (err as Error).message }, "upstream:weatherai:error");
    throw new WeatherApiError("Could not reach the weather service.", 503);
  }
}

export async function getJson(
  path: string,
  params: Record<string, string | number | boolean | undefined>,
): Promise<unknown> {
  const url = new URL(`${env.baseUrl}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  return call(url, { headers: authHeaders() });
}

export async function postForm(path: string, form: FormData): Promise<unknown> {
  return call(`${env.baseUrl}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
}

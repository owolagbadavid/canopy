# 🌳 Canopy — Orchard Intelligence

A small full-stack app on the **[WeatherAI API](https://weather-ai.co/docs)** that turns
weather into something an orchard grower can act on: forecast + agronomic risk flags, and a
computer-vision tree-canopy analyzer.

## Features

- **Weather + 7-day forecast** for any location, with derived **agronomic risk flags** (frost,
  heavy rain, damaging wind, high UV).
- **Tree-canopy analysis** — upload an orchard/aerial photo → tree count, density per acre,
  canopy coverage, health breakdown, AI notes, and an annotated overlay.
- **Map location picker** (Leaflet/OSM) + manual coords + geolocation.
- **Optional email login** (no password) → save farms and keep tree-analysis history.

## WeatherAI API

| Endpoint                 | Used for                                         |
| ------------------------ | ------------------------------------------------ |
| `GET /v1/weather`        | current + 7-day + hourly (+ optional AI summary) |
| `POST /v1/trees/analyze` | tree-canopy computer-vision analysis (multipart) |

`condition_code` values are **WMO weather codes**, mapped to labels server-side; icons come
from WeatherAI's CDN.

**Scaling under load.** Upstream pressure is kept flat as traffic grows: responses are cached
~10 minutes keyed by coordinate (rounded to ~110 m), and concurrent requests for the same
location are **coalesced** into a single in-flight upstream call (single-flight). With
`CACHE_DRIVER=redis` the cache, coalescing lock, and request counters are shared across
instances, so the app scales horizontally without multiplying upstream traffic.

## Architecture

```
Browser (React + Vite + Tailwind)
      │  (optional session cookie, JWT)
      ▼
/api/*  (Node + Express)  ──►  api.weather-ai.co
   ├─ cache (memory | Redis) ··· conserves the upstream quota
   ├─ adapter ················· normalizes upstream JSON → stable model
   ├─ risk engine ············· derives agronomic flags from the forecast
   ├─ MongoDB ················· users · saved farms · analysis history
   └─ /health · /ready · /metrics
```

The browser only ever talks to our own `/api/*`, so the API key never reaches the client and
there are no CORS concerns. Notable pieces:

- **Structured logging** — Pino JSON logs with a per-request `requestId` threaded through via
  `AsyncLocalStorage`.
- **Swappable cache** — `CACHE_DRIVER=memory|redis` behind one async interface.
- **Rate limiting** — `express-rate-limit`, tiered (anon per-IP / authed per-user) and
  per-endpoint, with per-endpoint overrides ([rateLimits.ts](server/src/rateLimits.ts)).
- **Auth (optional)** — passwordless email → JWT httpOnly cookie; gates only save/upload/history.
- **Persistence** — MongoDB (`users`, `locations`, `analyses`).
- **Health/metrics** — `/health` liveness, `/ready` dep checks (cache + Mongo), `/metrics`
  Prometheus.

## API endpoints

Login is optional: weather, risk flags and quota are public; saving farms, tree analysis and
history require the session cookie.

| Method                | Path                                     | Auth | Purpose                                     |
| --------------------- | ---------------------------------------- | ---- | ------------------------------------------- |
| `POST`                | `/api/auth/login` `{ email }`            | —    | Passwordless identify → sets session cookie |
| `POST`                | `/api/auth/logout`                       | —    | Clears the cookie                           |
| `GET`                 | `/api/auth/me`                           | ✅   | Current user                                |
| `GET`                 | `/api/weather?lat=&lon=&units=&ai=`      | —    | Normalized weather + risk flags             |
| `GET`                 | `/api/quota`                             | —    | Rate-limit snapshot + cache-hit stats       |
| `POST`                | `/api/trees/analyze` (multipart `image`) | ✅   | Tree-canopy analysis                        |
| `GET` `POST` `DELETE` | `/api/locations[/:id]`                   | ✅   | Saved farms                                 |
| `GET`                 | `/api/analyses`                          | ✅   | Analysis history                            |
| `GET`                 | `/health` · `/ready` · `/metrics`        | —    | Liveness · readiness · Prometheus           |

## Run locally

**Prerequisites:** Node 20+ · a WeatherAI key (`wai_…`) · MongoDB (local or Atlas) · Redis
(optional, only for `CACHE_DRIVER=redis`).

```bash
npm install
cp .env.example server/.env     # set WEATHER_AI_KEY, MONGO_URL, JWT_SECRET
npm run dev                     # web on :5173 (proxies /api), server on :8080
```

Production build: `npm run build && npm start` → everything served from <http://localhost:8080>.

### Environment

| Var                                             | Required  | Default      | Notes                                         |
| ----------------------------------------------- | --------- | ------------ | --------------------------------------------- |
| `WEATHER_AI_KEY`                                | ✅        | —            | `wai_` key, server-side only                  |
| `MONGO_URL`                                     | for login | —            | login + persistence; weather works without it |
| `JWT_SECRET`                                    | prod      | ephemeral    | session signing secret                        |
| `CACHE_DRIVER` / `REDIS_URL`                    |           | `memory`     | set `redis` + URL for a shared cache          |
| `RATE_LIMIT_PUBLIC_MAX` / `RATE_LIMIT_AUTH_MAX` |           | `30` / `120` | per-window caps (anon / authed)               |
| `PORT`                                          |           | `8080`       |                                               |

## Deploy (Render)

Includes a [`render.yaml`](render.yaml) Blueprint (single web service). New → Blueprint → set
`WEATHER_AI_KEY` and `MONGO_URL` (Atlas); `JWT_SECRET` is generated. Health check: `/health`.

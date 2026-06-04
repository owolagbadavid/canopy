import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { logger } from "../logger";
import { requestStore } from "../requestContext";
import { recordHttp } from "../metrics";

const REQUEST_ID_HEADER = "x-request-id";

// Bound the cardinality of the `route` metric label. Matched routes have a string
// path (e.g. "/api/weather"); the SPA catch-all is a RegExp and static assets have
// no route — both collapse to "static" so dashboards stay readable.
function routeLabel(req: Parameters<RequestHandler>[0]): string {
  const path = req.route?.path;
  if (typeof path === "string") return `${req.baseUrl}${path}`;
  return req.path.startsWith("/api") ? "unmatched" : "static";
}

export const httpLogger: RequestHandler = (req, res, next) => {
  const requestId = (req.headers[REQUEST_ID_HEADER] as string) || randomUUID();
  res.setHeader(REQUEST_ID_HEADER, requestId);

  const child = logger.child({ requestId });
  const start = process.hrtime.bigint();

  requestStore.run({ requestId, logger: child }, () => {
    child.debug({ method: req.method, path: req.path }, "request:start");

    res.on("finish", () => {
      const seconds = Number(process.hrtime.bigint() - start) / 1e9;
      recordHttp(req.method, routeLabel(req), res.statusCode, seconds);
      child.info(
        { method: req.method, path: req.path, status: res.statusCode, durationMs: Math.round(seconds * 1000) },
        "request:finish",
      );
    });

    next();
  });
};

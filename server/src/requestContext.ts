import { AsyncLocalStorage } from "node:async_hooks";
import { logger, type Logger } from "./logger";

interface RequestContext {
  requestId: string;
  logger: Logger;
}

// Threads a per-request correlation id + child logger through the whole request
// lifecycle
export const requestStore = new AsyncLocalStorage<RequestContext>();

export function getLogger(): Logger {
  return requestStore.getStore()?.logger ?? logger;
}

export function getRequestId(): string | undefined {
  return requestStore.getStore()?.requestId;
}

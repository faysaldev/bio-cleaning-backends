import { ERROR_REPORTING_WEBHOOK_URL } from "../config/ENV";
import logger from "./logger";

export const reportError = async (input: { error: unknown; requestId?: string; path?: string; method?: string }) => {
  const error = input.error instanceof Error ? input.error : new Error(String(input.error));
  logger.error("application_error", {
    requestId: input.requestId,
    path: input.path,
    method: input.method,
    error: { name: error.name, message: error.message, stack: error.stack },
  });
  if (!ERROR_REPORTING_WEBHOOK_URL) return;
  try {
    await fetch(ERROR_REPORTING_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event: "application_error", release: process.env.APP_RELEASE, requestId: input.requestId, path: input.path, method: input.method, name: error.name, message: error.message, stack: error.stack }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Error reporting must never take down the application.
  }
};

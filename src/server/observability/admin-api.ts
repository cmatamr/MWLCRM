import "server-only";

import { ApiRouteError } from "@/server/api/http";
import { logError } from "@/server/observability/logger";

type LogAdminApiErrorInput = {
  request: Request;
  route: string;
  error: unknown;
  userId?: string | null;
  metadata?: Record<string, unknown>;
};

function resolveErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Admin API error";
}

function resolveStack(error: unknown): string | null {
  if (error instanceof Error && error.stack) {
    return error.stack;
  }

  return null;
}

function resolveHttpStatus(error: unknown): number | null {
  if (error instanceof ApiRouteError) {
    return error.status;
  }

  return null;
}

export async function logAdminApiError(input: LogAdminApiErrorInput): Promise<void> {
  await logError({
    source: "api.admin",
    eventType: "admin_api_error",
    message: `Error en ${input.route}`,
    userId: input.userId ?? null,
    httpStatus: resolveHttpStatus(input.error),
    errorMessage: resolveErrorMessage(input.error),
    stackTrace: resolveStack(input.error),
    metadata: {
      route: input.route,
      method: input.request.method,
      path: new URL(input.request.url).pathname,
      code: input.error instanceof ApiRouteError ? input.error.code : null,
      details: input.error instanceof ApiRouteError ? input.error.details : null,
      ...input.metadata,
    },
  });
}

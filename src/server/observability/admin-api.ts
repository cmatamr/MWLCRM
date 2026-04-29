import "server-only";

import { logApiRouteError } from "@/server/observability/api-route";

type LogAdminApiErrorInput = {
  request: Request;
  route: string;
  error: unknown;
  userId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logAdminApiError(input: LogAdminApiErrorInput): Promise<void> {
  await logApiRouteError({
    request: input.request,
    route: input.route,
    source: "api.admin",
    defaultEventType: "admin_api_error",
    error: input.error,
    userId: input.userId ?? null,
    metadata: {
      path: new URL(input.request.url).pathname,
      ...input.metadata,
    },
  });
}

import { z } from "zod";

import { handleRouteError, ok } from "@/server/api/http";
import { logAdminApiError } from "@/server/observability/admin-api";
import { logError } from "@/server/observability/logger";
import { requireAdminSecurityContext } from "@/server/security/admin";
import { syncOpenAICostsForClient } from "@/server/services/ai-dashboard";

const schema = z.object({
  clientCode: z.string().trim().min(1),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  let userId: string | null = null;
  const route = "/api/admin/ai-usage/sync-openai-costs";
  let clientCode: string | null = null;

  try {
    const { user } = await requireAdminSecurityContext();
    userId = user.id;

    const payload = schema.parse(await request.json());
    clientCode = payload.clientCode;

    const result = await syncOpenAICostsForClient(payload);
    return ok(result);
  } catch (error) {
    const response = handleRouteError(error);

    await logError({
      source: "api.admin.ai-usage",
      eventType: "openai_cost_sync_error",
      message: "Error al sincronizar costos OpenAI",
      httpStatus: response.status,
      errorMessage: error instanceof Error ? error.message : "unknown",
      stackTrace: error instanceof Error ? error.stack : null,
      userId,
      metadata: {
        route,
        method: "POST",
        errorStage: "sync_openai_costs",
        clientCode,
        requestId: request.headers.get("x-request-id") ?? request.headers.get("x-correlation-id"),
      },
    });

    await logAdminApiError({
      request,
      route,
      error,
      userId,
      metadata: {
        clientCode,
        method: "POST",
        errorStage: "sync_openai_costs",
        httpStatus: response.status,
      },
    });

    return response;
  }
}

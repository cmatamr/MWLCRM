import { z } from "zod";

import { requireSessionProfile } from "@/server/api/auth";
import { handleRouteError, ok, badRequest } from "@/server/api/http";
import { logApiRouteError } from "@/server/observability/api-route";
import { logError } from "@/server/observability/logger";
import { getAiDashboardSummary } from "@/server/services/ai-dashboard";

const querySchema = z.object({
  clientCode: z.string().trim().min(1),
});

export async function GET(request: Request) {
  let userId: string | null = null;
  const route = "/api/ai-dashboard";

  try {
    const session = await requireSessionProfile();
    userId = session.user.id;

    const url = new URL(request.url);
    const query = querySchema.safeParse({
      clientCode: url.searchParams.get("clientCode") ?? undefined,
    });

    if (!query.success) {
      throw badRequest("Query param clientCode es requerido.");
    }

    const summary = await getAiDashboardSummary(query.data.clientCode);
    return ok(summary);
  } catch (error) {
    const response = handleRouteError(error);
    const url = new URL(request.url);

    await logError({
      source: "api.ai-dashboard",
      eventType: "ai_dashboard_summary_error",
      message: "Error al obtener resumen del dashboard IA",
      httpStatus: response.status,
      errorMessage: error instanceof Error ? error.message : "unknown",
      stackTrace: error instanceof Error ? error.stack : null,
      userId,
      metadata: {
        route,
        method: "GET",
        errorStage: "get_ai_dashboard_summary",
        clientCode: url.searchParams.get("clientCode"),
        requestId: request.headers.get("x-request-id") ?? request.headers.get("x-correlation-id"),
      },
    });

    await logApiRouteError({
      request,
      route,
      source: "api.ai-dashboard",
      defaultEventType: "ai_dashboard_api_error",
      error,
      httpStatus: response.status,
      userId,
      metadata: {
        clientCode: url.searchParams.get("clientCode"),
      },
    });

    return response;
  }
}

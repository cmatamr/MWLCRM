import { z } from "zod";

import { requireSessionProfile } from "@/server/api/auth";
import { handleRouteError, ok, badRequest, type RouteContext } from "@/server/api/http";
import { logApiRouteError } from "@/server/observability/api-route";
import { logError } from "@/server/observability/logger";
import { toggleClientAgent } from "@/server/services/ai-dashboard";

const bodySchema = z.object({
  enabled: z.boolean(),
});

type Params = {
  clientCode: string;
  agentCode: string;
};

export async function PATCH(request: Request, context: RouteContext<Params>) {
  let userId: string | null = null;
  const route = "/api/clients/:clientCode/agents/:agentCode/toggle";
  let clientCode: string | null = null;
  let agentCode: string | null = null;

  try {
    const session = await requireSessionProfile();
    userId = session.user.id;

    const params = await context.params;
    clientCode = params.clientCode;
    agentCode = params.agentCode;

    if (!clientCode || !agentCode) {
      throw badRequest("clientCode y agentCode son requeridos.");
    }

    const payload = bodySchema.parse(await request.json());

    const result = await toggleClientAgent({
      clientCode,
      agentCode,
      enabled: payload.enabled,
      actor: {
        userId: session.user.id,
        email: session.user.email ?? null,
        name: session.profile.full_name ?? null,
      },
    });

    return ok(result);
  } catch (error) {
    const response = handleRouteError(error);

    await logError({
      source: "api.ai-dashboard",
      eventType: "ai_dashboard_toggle_error",
      message: "Error al cambiar estado de agente del cliente",
      httpStatus: response.status,
      errorMessage: error instanceof Error ? error.message : "unknown",
      stackTrace: error instanceof Error ? error.stack : null,
      userId,
      metadata: {
        route,
        method: "PATCH",
        errorStage: "toggle_client_agent",
        clientCode,
        agentCode,
        requestId: request.headers.get("x-request-id") ?? request.headers.get("x-correlation-id"),
      },
    });

    await logApiRouteError({
      request,
      route,
      source: "api.ai-dashboard",
      defaultEventType: "ai_dashboard_toggle_api_error",
      error,
      httpStatus: response.status,
      userId,
      metadata: {
        clientCode,
        agentCode,
      },
    });

    return response;
  }
}

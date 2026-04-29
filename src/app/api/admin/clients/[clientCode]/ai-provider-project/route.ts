import { z } from "zod";

import { handleRouteError, ok, type RouteContext } from "@/server/api/http";
import { logAdminApiError } from "@/server/observability/admin-api";
import { logError } from "@/server/observability/logger";
import { requireAdminSecurityContext } from "@/server/security/admin";
import { upsertOpenAIProviderProjectForClient } from "@/server/services/ai-dashboard";

const schema = z.object({
  provider: z.literal("openai"),
  providerProjectId: z.string().trim().min(1),
  providerProjectName: z.string().trim().min(1),
  monthlyBudgetUsd: z.number().min(0),
  status: z.enum(["active", "inactive", "suspended", "revoked"]),
});

type Params = {
  clientCode: string;
};

export const runtime = "nodejs";

export async function PUT(request: Request, context: RouteContext<Params>) {
  let userId: string | null = null;
  const route = "/api/admin/clients/:clientCode/ai-provider-project";
  let clientCode: string | null = null;

  try {
    const { user, profile } = await requireAdminSecurityContext();
    userId = user.id;

    const params = await context.params;
    clientCode = params.clientCode;

    const payload = schema.parse(await request.json());

    const result = await upsertOpenAIProviderProjectForClient({
      clientCode,
      provider: payload.provider,
      providerProjectId: payload.providerProjectId,
      providerProjectName: payload.providerProjectName,
      monthlyBudgetUsd: payload.monthlyBudgetUsd,
      status: payload.status,
      actor: {
        userId: user.id,
        email: user.email ?? null,
        name: profile.full_name ?? null,
      },
    });

    return ok(result);
  } catch (error) {
    const response = handleRouteError(error);

    await logError({
      source: "api.admin.ai-provider-project",
      eventType: "ai_provider_project_upsert_error",
      message: "Error al guardar configuración OpenAI del cliente",
      httpStatus: response.status,
      errorMessage: error instanceof Error ? error.message : "unknown",
      stackTrace: error instanceof Error ? error.stack : null,
      userId,
      metadata: {
        route,
        method: "PUT",
        errorStage: "upsert_openai_provider_project",
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
        method: "PUT",
        errorStage: "upsert_openai_provider_project",
        httpStatus: response.status,
      },
    });

    return response;
  }
}

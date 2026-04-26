import { z } from "zod";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { badRequest, handleRouteError, notFound, ok } from "@/server/api/http";
import { logAdminApiError } from "@/server/observability/admin-api";
import { requireAdminSecurityContext } from "@/server/security/admin";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext) {
  let adminUserId: string | null = null;

  try {
    const { user } = await requireAdminSecurityContext();
    adminUserId = user.id;

    const { id } = paramsSchema.parse(await context.params);

    const service = createSupabaseServiceClient();
    const { data, error } = await service
      .from("app_logs")
      .select(
        "id, created_at, level, source, event_type, message, correlation_id, request_id, user_id, lead_id, thread_id, workflow_name, node_name, external_provider, external_request_id, http_status, error_message, stack_trace, metadata",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw badRequest("No se pudo cargar el detalle del log.", error);
    }

    if (!data) {
      throw notFound("Log no encontrado.");
    }

    return ok({ log: data });
  } catch (error) {
    await logAdminApiError({
      request,
      route: "GET /api/admin/logs/[id]",
      error,
      userId: adminUserId,
    });

    return handleRouteError(error);
  }
}

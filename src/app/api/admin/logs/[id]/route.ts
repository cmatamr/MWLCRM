import { z } from "zod";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { badRequest, handleRouteError, notFound, ok } from "@/server/api/http";
import { logAdminApiError } from "@/server/observability/admin-api";
import { requireAdminSecurityContext } from "@/server/security/admin";

const paramsSchema = z.object({
  id: z.string().uuid(),
});
const querySchema = z.object({
  log_type: z.enum(["app_logs", "app_user_security_events"]).optional(),
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
    const url = new URL(request.url);
    const query = querySchema.parse({
      log_type: url.searchParams.get("log_type") ?? undefined,
    });
    const requestedLogType = query.log_type;

    const service = createSupabaseServiceClient();
    if (!requestedLogType || requestedLogType === "app_logs") {
      const { data, error } = await service
        .from("app_logs")
        .select(
          "id, created_at, level, source, event_type, message, correlation_id, request_id, user_id, lead_id, thread_id, workflow_name, node_name, external_provider, external_request_id, http_status, error_message, stack_trace, metadata",
        )
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw badRequest("No se pudo cargar el detalle del log en app_logs.", error);
      }

      if (data) {
        return ok({
          log: {
            ...data,
            log_type: "app_logs",
          },
        });
      }
    }

    if (!requestedLogType || requestedLogType === "app_user_security_events") {
      const { data: securityData, error: securityError } = await service
        .from("app_user_security_events")
        .select("id, created_at, event_type, user_id, actor_user_id, event_metadata, ip_address, user_agent")
        .eq("id", id)
        .maybeSingle();

      if (securityError) {
        throw badRequest("No se pudo cargar el detalle del log en app_user_security_events.", securityError);
      }

      if (securityData) {
        const eventType = String(securityData.event_type ?? "");
        const level = /failed|error|denied|locked|forbidden/i.test(eventType) ? "warn" : "info";

        return ok({
          log: {
            id: securityData.id,
            created_at: securityData.created_at,
            level,
            source: "security.events",
            event_type: eventType,
            message: `Security event: ${eventType}`,
            correlation_id: null,
            request_id: null,
            user_id: securityData.user_id ?? null,
            lead_id: null,
            thread_id: null,
            workflow_name: null,
            node_name: null,
            external_provider: null,
            external_request_id: null,
            http_status: null,
            error_message: null,
            stack_trace: null,
            metadata: {
              ...(securityData.event_metadata ?? {}),
              actor_user_id: securityData.actor_user_id ?? null,
              ip_address: securityData.ip_address ?? null,
              user_agent: securityData.user_agent ?? null,
              table: "app_user_security_events",
            },
            log_type: "app_user_security_events",
          },
        });
      }
    }

    throw notFound("Log no encontrado.");
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

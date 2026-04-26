import { z } from "zod";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { handleRouteError, ok, badRequest, notFound } from "@/server/api/http";
import { logAdminApiError } from "@/server/observability/admin-api";
import { requireAdminSecurityContext } from "@/server/security/admin";
import { getProfileByUserId } from "@/server/security";

const paramsSchema = z.object({ userId: z.string().uuid() });

type RouteContext = { params: Promise<{ userId: string }> };

export async function GET(request: Request, context: RouteContext) {
  let adminUserId: string | null = null;

  try {
    const { user } = await requireAdminSecurityContext();
    adminUserId = user.id;
    const params = paramsSchema.parse(await context.params);

    const service = createSupabaseServiceClient();
    const targetProfile = await getProfileByUserId(service, params.userId);

    if (!targetProfile) {
      throw notFound("Usuario no encontrado.");
    }

    const { data, error } = await service
      .from("app_user_security_events")
      .select("id, user_id, actor_user_id, event_type, event_metadata, ip_address, user_agent, created_at")
      .eq("user_id", params.userId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      throw badRequest("No se pudo cargar auditoria del usuario.", error);
    }

    return ok({ events: data ?? [] });
  } catch (error) {
    await logAdminApiError({
      request,
      route: "GET /api/admin/users/[userId]/security-events",
      error,
      userId: adminUserId,
    });

    return handleRouteError(error);
  }
}

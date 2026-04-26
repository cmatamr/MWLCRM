import { z } from "zod";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { handleRouteError, ok, badRequest } from "@/server/api/http";
import { logAdminApiError } from "@/server/observability/admin-api";
import { logInfo } from "@/server/observability/logger";
import { assertJsonRequest, assertTrustedOrigin } from "@/server/security/request-guards";
import {
  ensureRoleTransitionAllowed,
  loadTargetUserOrThrow,
  normalizeAdminUserRow,
  requireAdminSecurityContext,
  updateAdminUserSchema,
} from "@/server/security/admin";
import { getRequestIp, getRequestUserAgent, logSecurityEvent, nowIso } from "@/server/security";

const paramsSchema = z.object({
  userId: z.string().uuid(),
});

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const request = _request;
  let adminUserId: string | null = null;

  try {
    const { user } = await requireAdminSecurityContext();
    adminUserId = user.id;
    const params = paramsSchema.parse(await context.params);

    const service = createSupabaseServiceClient();
    const authSchemaClient = createSupabaseServiceClient("auth");
    const target = await loadTargetUserOrThrow(service, authSchemaClient, params.userId);

    return ok({
      user: normalizeAdminUserRow(target),
    });
  } catch (error) {
    await logAdminApiError({
      request,
      route: "GET /api/admin/users/[userId]",
      error,
      userId: adminUserId,
    });

    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertTrustedOrigin(request);
    assertJsonRequest(request);

    const { user: adminUser } = await requireAdminSecurityContext();
    const params = paramsSchema.parse(await context.params);
    const payload = updateAdminUserSchema.parse(await request.json());

    if (!payload.fullName && !payload.role) {
      throw badRequest("No hay cambios para aplicar.");
    }

    const service = createSupabaseServiceClient();
    const authSchemaClient = createSupabaseServiceClient("auth");
    const target = await loadTargetUserOrThrow(service, authSchemaClient, params.userId);

    if (payload.role) {
      await ensureRoleTransitionAllowed(service, {
        adminUserId: adminUser.id,
        target: target.profile,
        newRole: payload.role,
      });
    }

    const updates: Record<string, unknown> = {
      updated_by: adminUser.id,
      updated_at: nowIso(),
    };

    if (payload.fullName) {
      updates.full_name = payload.fullName;
    }

    if (payload.role) {
      updates.role = payload.role;
    }

    const { error } = await service.from("app_user_profiles").update(updates).eq("id", params.userId);

    if (error) {
      throw badRequest("No se pudo actualizar el usuario.", error);
    }

    if (payload.role && payload.role !== target.profile.role) {
      await logSecurityEvent(service, {
        userId: params.userId,
        actorUserId: adminUser.id,
        eventType: "role_changed",
        metadata: {
          previous_role: target.profile.role,
          new_role: payload.role,
        },
        ip: getRequestIp(request),
        userAgent: getRequestUserAgent(request),
      });
    }

    await logInfo({
      source: "admin.users",
      eventType: "admin_user_updated",
      message: "Perfil de usuario actualizado por admin.",
      userId: adminUser.id,
      metadata: {
        action: "update_profile",
        target_user_id: params.userId,
        changed_full_name: Boolean(payload.fullName),
        previous_role: payload.role ? target.profile.role : null,
        new_role: payload.role ?? null,
      },
    });

    const refreshed = await loadTargetUserOrThrow(service, authSchemaClient, params.userId);

    return ok({
      user: normalizeAdminUserRow(refreshed),
    });
  } catch (error) {
    await logAdminApiError({
      request,
      route: "PATCH /api/admin/users/[userId]",
      error,
    });

    return handleRouteError(error);
  }
}

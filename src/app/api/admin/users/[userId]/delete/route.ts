import { z } from "zod";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { handleRouteError, ok } from "@/server/api/http";
import { logAdminApiError } from "@/server/observability/admin-api";
import { assertTrustedOrigin } from "@/server/security/request-guards";
import {
  deleteUserByAdmin,
  ensureNotLastActiveAdmin,
  ensureNotSelfMutation,
  loadTargetUserOrThrow,
  requireAdminSecurityContext,
} from "@/server/security/admin";
import { getRequestIp, getRequestUserAgent } from "@/server/security";

const paramsSchema = z.object({ userId: z.string().uuid() });

type RouteContext = { params: Promise<{ userId: string }> };

export async function POST(request: Request, context: RouteContext) {
  let adminUserId: string | null = null;

  try {
    assertTrustedOrigin(request);

    const { user: adminUser } = await requireAdminSecurityContext();
    adminUserId = adminUser.id;
    const params = paramsSchema.parse(await context.params);

    const service = createSupabaseServiceClient();
    const authSchemaClient = createSupabaseServiceClient("auth");
    const target = await loadTargetUserOrThrow(service, authSchemaClient, params.userId);

    ensureNotSelfMutation(adminUser.id, params.userId, "eliminar");
    await ensureNotLastActiveAdmin(service, target.profile);

    await deleteUserByAdmin(service, {
      adminUserId: adminUser.id,
      targetUserId: params.userId,
      targetRole: target.profile.role,
      targetEmail: target.email,
      ip: getRequestIp(request),
      userAgent: getRequestUserAgent(request),
    });

    return ok({ deleted: true });
  } catch (error) {
    await logAdminApiError({
      request,
      route: "POST /api/admin/users/[userId]/delete",
      error,
      userId: adminUserId,
    });

    return handleRouteError(error);
  }
}

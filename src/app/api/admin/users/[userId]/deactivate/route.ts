import { z } from "zod";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { handleRouteError, ok } from "@/server/api/http";
import { logAdminApiError } from "@/server/observability/admin-api";
import { assertTrustedOrigin } from "@/server/security/request-guards";
import {
  deactivateUserByAdmin,
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

    ensureNotSelfMutation(adminUser.id, params.userId, "desactivarse");
    await ensureNotLastActiveAdmin(service, target.profile);

    await deactivateUserByAdmin(service, {
      adminUserId: adminUser.id,
      targetUserId: params.userId,
      ip: getRequestIp(request),
      userAgent: getRequestUserAgent(request),
    });

    return ok({ deactivated: true });
  } catch (error) {
    await logAdminApiError({
      request,
      route: "POST /api/admin/users/[userId]/deactivate",
      error,
      userId: adminUserId,
    });

    return handleRouteError(error);
  }
}

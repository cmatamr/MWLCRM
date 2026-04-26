import { z } from "zod";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { handleRouteError, ok } from "@/server/api/http";
import { logAdminApiError } from "@/server/observability/admin-api";
import { assertTrustedOrigin } from "@/server/security/request-guards";
import {
  activateUserByAdmin,
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

    await activateUserByAdmin(service, {
      adminUserId: adminUser.id,
      targetUserId: params.userId,
      target: target.profile,
      ip: getRequestIp(request),
      userAgent: getRequestUserAgent(request),
    });

    return ok({ activated: true });
  } catch (error) {
    await logAdminApiError({
      request,
      route: "POST /api/admin/users/[userId]/activate",
      error,
      userId: adminUserId,
    });

    return handleRouteError(error);
  }
}

import { z } from "zod";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { handleRouteError, ok, badRequest } from "@/server/api/http";
import { logAdminApiError } from "@/server/observability/admin-api";
import { assertJsonRequest, assertTrustedOrigin } from "@/server/security/request-guards";
import { forceResetUsersByPolicy, requireAdminSecurityContext } from "@/server/security/admin";
import { getRequestIp, getRequestUserAgent } from "@/server/security";

const schema = z.object({
  confirm: z.literal(true),
});

export async function POST(request: Request) {
  let adminUserId: string | null = null;

  try {
    assertTrustedOrigin(request);
    assertJsonRequest(request);

    const { user: adminUser } = await requireAdminSecurityContext();
    adminUserId = adminUser.id;
    const payload = schema.parse(await request.json());

    if (!payload.confirm) {
      throw badRequest("Se requiere confirmacion explicita.");
    }

    const service = createSupabaseServiceClient();
    const affectedUsers = await forceResetUsersByPolicy(service, {
      adminUserId: adminUser.id,
      ip: getRequestIp(request),
      userAgent: getRequestUserAgent(request),
    });

    return ok({
      forced: true,
      affectedUsers,
    });
  } catch (error) {
    await logAdminApiError({
      request,
      route: "POST /api/admin/security/password-policy/force-reset-users",
      error,
      userId: adminUserId,
    });

    return handleRouteError(error);
  }
}

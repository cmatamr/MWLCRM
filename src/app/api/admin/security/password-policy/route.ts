import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { handleRouteError, ok } from "@/server/api/http";
import { logAdminApiError } from "@/server/observability/admin-api";
import { assertJsonRequest, assertTrustedOrigin } from "@/server/security/request-guards";
import {
  patchPasswordPolicy,
  policyUpdateSchema,
  requireAdminSecurityContext,
} from "@/server/security/admin";
import { getActivePasswordPolicy, getRequestIp, getRequestUserAgent } from "@/server/security";

export async function GET(request: Request) {
  let adminUserId: string | null = null;

  try {
    const { user } = await requireAdminSecurityContext();
    adminUserId = user.id;
    const service = createSupabaseServiceClient();
    const policy = await getActivePasswordPolicy(service);

    return ok({ policy });
  } catch (error) {
    await logAdminApiError({
      request,
      route: "GET /api/admin/security/password-policy",
      error,
      userId: adminUserId,
    });

    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  let adminUserId: string | null = null;

  try {
    assertTrustedOrigin(request);
    assertJsonRequest(request);

    const { user: adminUser } = await requireAdminSecurityContext();
    adminUserId = adminUser.id;
    const payload = policyUpdateSchema.parse(await request.json());

    const service = createSupabaseServiceClient();
    await patchPasswordPolicy(service, {
      adminUserId: adminUser.id,
      payload,
      ip: getRequestIp(request),
      userAgent: getRequestUserAgent(request),
    });

    const updated = await getActivePasswordPolicy(service);

    return ok({ policy: updated });
  } catch (error) {
    await logAdminApiError({
      request,
      route: "PATCH /api/admin/security/password-policy",
      error,
      userId: adminUserId,
    });

    return handleRouteError(error);
  }
}

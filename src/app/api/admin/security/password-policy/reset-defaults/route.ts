import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { handleRouteError, ok } from "@/server/api/http";
import { logAdminApiError } from "@/server/observability/admin-api";
import { assertTrustedOrigin } from "@/server/security/request-guards";
import { requireAdminSecurityContext, resetPasswordPolicyToDefaults } from "@/server/security/admin";
import { getActivePasswordPolicy, getRequestIp, getRequestUserAgent } from "@/server/security";

export async function POST(request: Request) {
  let adminUserId: string | null = null;

  try {
    assertTrustedOrigin(request);

    const { user: adminUser } = await requireAdminSecurityContext();
    adminUserId = adminUser.id;
    const service = createSupabaseServiceClient();

    await resetPasswordPolicyToDefaults(service, {
      adminUserId: adminUser.id,
      ip: getRequestIp(request),
      userAgent: getRequestUserAgent(request),
    });

    const policy = await getActivePasswordPolicy(service);

    return ok({ policy, reset: true });
  } catch (error) {
    await logAdminApiError({
      request,
      route: "POST /api/admin/security/password-policy/reset-defaults",
      error,
      userId: adminUserId,
    });

    return handleRouteError(error);
  }
}

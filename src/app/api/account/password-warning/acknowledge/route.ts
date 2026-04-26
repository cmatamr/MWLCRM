import { logApiRouteError } from "@/server/observability/api-route";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { handleRouteError, ok, forbidden } from "@/server/api/http";
import {
  getDaysUntilExpiration,
  getRequestIp,
  getRequestUserAgent,
  isGovernedPasswordRole,
  logSecurityEvent,
} from "@/server/security";
import { assertTrustedOrigin } from "@/server/security/request-guards";
import { requireGovernedSession } from "@/server/security/session";

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);

    const { user, profile } = await requireGovernedSession();

    if (!isGovernedPasswordRole(profile.role)) {
      throw forbidden("Esta cuenta no aplica para aviso de expiracion.");
    }

    const daysUntilExpiration = getDaysUntilExpiration(profile.password_expires_at);

    if (profile.password_reset_required || daysUntilExpiration == null || daysUntilExpiration <= 0) {
      throw forbidden("Tu contrasena vencio. Debes cambiarla para continuar.");
    }

    const service = createSupabaseServiceClient();
    await logSecurityEvent(service, {
      userId: user.id,
      actorUserId: user.id,
      eventType: "password_expiration_warning_acknowledged",
      metadata: {
        days_until_expiration: daysUntilExpiration,
      },
      ip: getRequestIp(request),
      userAgent: getRequestUserAgent(request),
    });

    return ok({
      acknowledged: true,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    const response = handleRouteError(error);
    await logApiRouteError({
      request: request,
      route: "/api/account/password-warning/acknowledge",
      source: "api.security",
      defaultEventType: "security_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

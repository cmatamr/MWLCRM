import { buildSyntheticApiRequest, logApiRouteError } from "@/server/observability/api-route";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { handleRouteError, ok } from "@/server/api/http";
import {
  getActivePasswordPolicy,
  getDaysUntilExpiration,
  getPasswordWarningMessage,
  isGovernedPasswordRole,
} from "@/server/security";
import { requireGovernedSession } from "@/server/security/session";

export async function GET() {
  try {
    const { user, profile } = await requireGovernedSession();
    const service = createSupabaseServiceClient();
    const policy = await getActivePasswordPolicy(service);

    const daysUntilExpiration = getDaysUntilExpiration(profile.password_expires_at);

    return ok({
      userId: user.id,
      role: profile.role,
      status: profile.status,
      isLocked: profile.is_locked,
      passwordResetRequired: profile.password_reset_required,
      passwordUpdatedAt: profile.password_updated_at,
      passwordExpiresAt: profile.password_expires_at,
      daysUntilExpiration,
      warningMessage:
        daysUntilExpiration != null && daysUntilExpiration <= policy.expiration_warning_days
          ? getPasswordWarningMessage(daysUntilExpiration)
          : null,
      governedByExpiration: isGovernedPasswordRole(profile.role),
      policy: {
        minimumLength: policy.minimum_length,
        minimumUppercase: policy.minimum_uppercase,
        minimumLowercase: policy.minimum_lowercase,
        minimumNumbers: policy.minimum_numbers,
        minimumSymbols: policy.minimum_symbols,
        passwordHistoryCheckCount: policy.password_history_check_count,
        passwordExpirationDays: policy.password_expiration_days,
        expirationWarningDays: policy.expiration_warning_days,
        hashAlgorithm: policy.hash_algorithm,
      },
    });
  } catch (error) {
    const response = handleRouteError(error);
    await logApiRouteError({
      request: buildSyntheticApiRequest("/api/account/security", "GET"),
      route: "/api/account/security",
      source: "api.security",
      defaultEventType: "security_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

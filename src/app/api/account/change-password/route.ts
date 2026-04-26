import { logApiRouteError } from "@/server/observability/api-route";
import { z } from "zod";

import {
  createSupabaseServiceClient,
  createSupabaseStatelessAnonClient,
} from "@/lib/supabase/admin";
import { handleRouteError, ok, unauthorized, badRequest } from "@/server/api/http";
import {
  applyNewPassword,
  getActivePasswordPolicy,
  getDaysUntilExpiration,
  getProfileByUserId,
  getRequestIp,
  getRequestUserAgent,
  logSecurityEvent,
} from "@/server/security";
import { assertJsonRequest, assertTrustedOrigin } from "@/server/security/request-guards";
import { requireAuthenticatedUser } from "@/server/security/session";

const schema = z
  .object({
    currentPassword: z.string().min(1).optional(),
    newPassword: z.string().min(1),
    confirmPassword: z.string().min(1),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Password confirmation mismatch.",
    path: ["confirmPassword"],
  });

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);
    assertJsonRequest(request);

    const payload = schema.parse(await request.json());
    const user = await requireAuthenticatedUser();
    const service = createSupabaseServiceClient();
    const profile = await getProfileByUserId(service, user.id);

    if (!profile) {
      throw badRequest("No internal profile found for this account.");
    }

    const policy = await getActivePasswordPolicy(service);
    const ip = getRequestIp(request);
    const userAgent = getRequestUserAgent(request);
    const daysUntilExpiration = getDaysUntilExpiration(profile.password_expires_at);

    const currentPasswordRequired =
      !profile.password_reset_required &&
      !profile.is_locked &&
      daysUntilExpiration != null &&
      daysUntilExpiration > 0;

    if (currentPasswordRequired && !payload.currentPassword) {
      throw badRequest("Current password is required.");
    }

    if (currentPasswordRequired) {
      const statelessClient = createSupabaseStatelessAnonClient();
      const { error: verifyError } = await statelessClient.auth.signInWithPassword({
        email: user.email ?? "",
        password: payload.currentPassword ?? "",
      });

      if (verifyError) {
        throw unauthorized("La contrasena actual no es valida.");
      }

      await statelessClient.auth.signOut();
    }

    const eventType = profile.is_locked
      ? "locked_account_reset"
      : profile.password_reset_required || (daysUntilExpiration != null && daysUntilExpiration <= 0)
        ? "expired_password_change"
        : "user_change";

    await applyNewPassword(service, {
      userId: user.id,
      actorUserId: user.id,
      newPassword: payload.newPassword,
      eventType,
      profileRole: profile.role,
      policy,
      ip,
      userAgent,
    });

    if (profile.password_reset_required) {
      await logSecurityEvent(service, {
        userId: user.id,
        actorUserId: user.id,
        eventType: "password_reset_completed",
        ip,
        userAgent,
      });
    }

    return ok({
      changed: true,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    const response = handleRouteError(error);
    await logApiRouteError({
      request: request,
      route: "/api/account/change-password",
      source: "api.security",
      defaultEventType: "security_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

import { logApiRouteError } from "@/server/observability/api-route";
import { z } from "zod";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { handleRouteError, ok, badRequest } from "@/server/api/http";
import { assertJsonRequest, assertTrustedOrigin } from "@/server/security/request-guards";
import { requireAuthenticatedUser } from "@/server/security/session";
import {
  applyNewPassword,
  getActivePasswordPolicy,
  getProfileByUserId,
  getRequestIp,
  getRequestUserAgent,
  logSecurityEvent,
} from "@/server/security";

const schema = z
  .object({
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

    const eventType = profile.is_locked
      ? "locked_account_reset"
      : profile.password_reset_required
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

    await logSecurityEvent(service, {
      userId: user.id,
      actorUserId: user.id,
      eventType: "password_reset_completed",
      ip,
      userAgent,
    });

    return ok({
      completed: true,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    const response = handleRouteError(error);
    await logApiRouteError({
      request: request,
      route: "/api/auth/complete-password-reset",
      source: "api.security",
      defaultEventType: "security_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

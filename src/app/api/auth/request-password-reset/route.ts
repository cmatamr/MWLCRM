import { logApiRouteError } from "@/server/observability/api-route";
import { z } from "zod";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { handleRouteError, ok } from "@/server/api/http";
import { logWarn } from "@/server/observability/logger";
import { assertJsonRequest } from "@/server/security/request-guards";
import { sendPasswordSetupOrResetEmail } from "@/server/security/admin";
import {
  getAuthUserByEmail,
  getProfileByUserId,
  getRequestIp,
  getRequestUserAgent,
  logSecurityEvent,
  normalizeEmail,
  updateUserProfileSecurity,
} from "@/server/security";

const schema = z.object({
  email: z.string().trim().email(),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertJsonRequest(request);
    const payload = schema.parse(await request.json());
    const email = normalizeEmail(payload.email);
    const ip = getRequestIp(request);
    const userAgent = getRequestUserAgent(request);

    const service = createSupabaseServiceClient();
    const authSchemaClient = createSupabaseServiceClient("auth");
    const authUser = await getAuthUserByEmail(email, authSchemaClient);

    if (authUser) {
      const profile = await getProfileByUserId(service, authUser.id);

      if (profile && profile.is_active) {
        try {
          await sendPasswordSetupOrResetEmail(service, email);

          await updateUserProfileSecurity(service, profile.id, {
            status: "pending_password_reset",
            password_reset_required: true,
          });

          await logSecurityEvent(service, {
            userId: profile.id,
            eventType: "password_reset_requested",
            metadata: {
              source: "self_service",
            },
            ip,
            userAgent,
          });
        } catch (error) {
          await logWarn({
            source: "api.auth",
            eventType: "auth_session_error",
            message: "Self-service password reset email failed",
            userId: profile.id,
            errorMessage: error instanceof Error ? error.message : "unknown",
            stackTrace: error instanceof Error ? error.stack : null,
            metadata: {
              route: "/api/auth/request-password-reset",
              method: "POST",
              operation: "send_password_setup_or_reset_email",
              environment: process.env.VERCEL_ENV?.trim() || process.env.NODE_ENV?.trim() || "unknown",
            },
          });
        }
      }
    }

    return ok({
      sent: true,
      message:
        "Si el correo existe, recibiras un enlace para restablecer tu contrasena.",
    });
  } catch (error) {
    const response = handleRouteError(error);
    await logApiRouteError({
      request: request,
      route: "/api/auth/request-password-reset",
      source: "api.security",
      defaultEventType: "security_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

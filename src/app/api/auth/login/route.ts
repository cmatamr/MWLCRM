import { logApiRouteError } from "@/server/observability/api-route";
import { z } from "zod";

import { maskEmail } from "@/lib/security/redaction";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fail, handleRouteError, ok, ApiRouteError, badRequest } from "@/server/api/http";
import { findSensitiveAuthQueryKeys, hasSensitiveAuthQuery } from "@/server/security/auth-request-guards";
import { assertJsonRequest } from "@/server/security/request-guards";
import {
  assertProfileCanLogin,
  getActivePasswordPolicy,
  getAuthUserByEmail,
  getProfileByUserId,
  getRequestIp,
  getRequestUserAgent,
  incrementFailedLoginAttempt,
  logSecurityEvent,
  markLoginSuccess,
  normalizeEmail,
  resolveLoginDecision,
} from "@/server/security";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  turnstileToken: z.string().trim().min(1),
});

type LoginPayload = z.infer<typeof loginSchema>;

async function parseLoginPayload(request: Request): Promise<LoginPayload> {
  assertJsonRequest(request);

  try {
    return loginSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw badRequest("Solicitud de login invalida.");
    }

    throw error;
  }
}

async function rejectIfSensitiveQueryParams(request: Request): Promise<Response | null> {
  const url = new URL(request.url);

  if (!hasSensitiveAuthQuery(url.searchParams)) {
    return null;
  }

  const ip = getRequestIp(request);
  const userAgent = getRequestUserAgent(request);
  const email = normalizeEmail(url.searchParams.get("email") ?? "");
  const maskedEmail = maskEmail(email);
  const sensitiveKeys = findSensitiveAuthQueryKeys(url.searchParams);
  const service = createSupabaseServiceClient();

  await logSecurityEvent(service, {
    eventType: "auth_query_param_rejected",
    ip,
    userAgent,
    metadata: {
      email: maskedEmail,
      success: false,
      reason_code: "PASSWORD_QUERY_PARAM_FORBIDDEN",
      sensitive_query_keys: sensitiveKeys,
      timestamp: new Date().toISOString(),
    },
  });

  return fail(
    {
      code: "INVALID_AUTH_REQUEST",
      message: "Solicitud de autenticacion invalida.",
    },
    { status: 400 },
  );
}

function mapTurnstileErrors(errorCodes: string[]): ApiRouteError {
  if (errorCodes.includes("timeout-or-duplicate")) {
    return new ApiRouteError({
      status: 400,
      code: "TURNSTILE_EXPIRED",
      message: "Captcha expired. Please complete it again.",
      details: {
        errorCodes,
      },
    });
  }

  return new ApiRouteError({
    status: 400,
    code: "TURNSTILE_INVALID",
    message: "Captcha validation failed.",
    details: {
      errorCodes,
    },
  });
}

function invalidCredentialsError() {
  return new ApiRouteError({
    status: 401,
    code: "INVALID_CREDENTIALS",
    message: "Correo o contrasena incorrectos.",
  });
}

export const runtime = "nodejs";

export async function GET(request: Request) {
  const queryViolationResponse = await rejectIfSensitiveQueryParams(request);
  if (queryViolationResponse) {
    return queryViolationResponse;
  }

  return fail(
    {
      code: "METHOD_NOT_ALLOWED",
      message: "Usa POST para iniciar sesion.",
    },
    { status: 405 },
  );
}

export async function POST(request: Request) {
  try {
    const queryViolationResponse = await rejectIfSensitiveQueryParams(request);
    if (queryViolationResponse) {
      return queryViolationResponse;
    }

    const payload = await parseLoginPayload(request);
    const email = normalizeEmail(payload.email);
    const ip = getRequestIp(request);
    const userAgent = getRequestUserAgent(request);

    const turnstileResult = await verifyTurnstileToken({
      token: payload.turnstileToken,
      remoteIp: ip,
    });

    if (!turnstileResult.success) {
      throw mapTurnstileErrors(turnstileResult.errorCodes);
    }

    const supabase = await createSupabaseServerClient();
    const service = createSupabaseServiceClient();
    const policy = await getActivePasswordPolicy(service);

    const authUser = await getAuthUserByEmail(email, service);

    if (!authUser?.id) {
      throw invalidCredentialsError();
    }

    const profile = await getProfileByUserId(service, authUser.id);

    if (!profile) {
      throw invalidCredentialsError();
    }

    try {
      assertProfileCanLogin(profile);
    } catch (error) {
      if (error instanceof ApiRouteError && error.code === "ACCOUNT_LOCKED") {
        return fail(
          {
            code: "ACCOUNT_LOCKED",
            message: "Tu cuenta fue bloqueada por seguridad. Restablece tu contrasena para continuar.",
          },
          { status: 423 },
        );
      }

      throw invalidCredentialsError();
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: payload.password,
    });

    if (signInError) {
      const lockResult = await incrementFailedLoginAttempt(service, profile, policy, {
        ip,
        userAgent,
        attemptedEmail: email,
      });

      return fail(
        {
          code: "INVALID_CREDENTIALS",
          message: "Correo o contrasena incorrectos.",
          details: {
            failed_login_attempts: lockResult.attempts,
            account_locked: lockResult.locked,
          },
        },
        { status: 401 },
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw invalidCredentialsError();
    }

    await markLoginSuccess(service, user, {
      ip,
      userAgent,
      email,
    });

    const refreshedProfile = await getProfileByUserId(service, user.id);

    if (!refreshedProfile) {
      throw invalidCredentialsError();
    }

    const decision = await resolveLoginDecision(service, refreshedProfile, policy, {
      ip,
      userAgent,
    });

    if (refreshedProfile.role === "service") {
      await logSecurityEvent(service, {
        userId: user.id,
        eventType: "login_success",
        metadata: {
          attempted_email: maskEmail(email),
          success: false,
          reason_code: "SERVICE_ACCOUNT_RESTRICTED",
          timestamp: new Date().toISOString(),
        },
        ip,
        userAgent,
      });

      await supabase.auth.signOut();

      return fail(
        {
          code: "SERVICE_ACCOUNT_RESTRICTED",
          message: "Cuenta de servicio sin acceso al dashboard.",
        },
        { status: 403 },
      );
    }

    return ok({
      authenticated: true,
      redirectTo: decision.redirectTo,
      sessionMode: decision.sessionMode,
      warningMessage: decision.warningMessage,
      daysUntilExpiration: decision.daysUntilExpiration,
    });
  } catch (error) {
    if (error instanceof ApiRouteError) {
      return fail(
        {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        { status: error.status },
      );
    }

    const response = handleRouteError(error);
    await logApiRouteError({
      request: request,
      route: "/api/auth/login",
      source: "api.security",
      defaultEventType: "security_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

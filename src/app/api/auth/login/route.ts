import { createHash } from "node:crypto";
import { z } from "zod";

import { maskEmail } from "@/lib/security/redaction";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logError, logInfo } from "@/server/observability/logger";
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
type LoginErrorContext = {
  hasTurnstileToken: boolean;
  turnstileSuccess?: boolean;
  turnstileStatusCode?: number;
};

const LOGIN_ROUTE = "/api/auth/login";
const REQUEST_ID_HEADERS = [
  "x-request-id",
  "x-correlation-id",
  "cf-ray",
] as const;

function resolveEnvironment(): string {
  return process.env.VERCEL_ENV?.trim() || process.env.NODE_ENV?.trim() || "unknown";
}

function resolveRequestId(request: Request): string | null {
  for (const headerName of REQUEST_ID_HEADERS) {
    const value = request.headers.get(headerName)?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

function truncateUserAgent(userAgent: string | undefined, maxLength = 160): string | null {
  if (!userAgent) {
    return null;
  }

  if (userAgent.length <= maxLength) {
    return userAgent;
  }

  return `${userAgent.slice(0, maxLength)}...`;
}

function hashIpAddress(ip: string | undefined): string | null {
  if (!ip) {
    return null;
  }

  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
}

function resolveErrorName(error: unknown): string {
  if (error instanceof Error && error.name) {
    return error.name;
  }

  const record = asRecord(error);
  if (typeof record?.name === "string" && record.name.trim()) {
    return record.name.trim();
  }

  return "UnknownError";
}

function resolveErrorCode(error: unknown): string | null {
  if (error instanceof ApiRouteError) {
    return error.code;
  }

  const record = asRecord(error);
  if (typeof record?.code === "string" && record.code.trim()) {
    return record.code.trim();
  }

  return null;
}

function resolveErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return "Unknown login error";
}

function resolveStackTrace(error: unknown): string | null {
  if (error instanceof Error && error.stack) {
    return error.stack;
  }

  return null;
}

function extractTurnstileStatusCode(error: unknown): number | undefined {
  if (!(error instanceof ApiRouteError)) {
    return undefined;
  }

  const details = asRecord(error.details);
  const status = details?.status;

  if (typeof status === "number" && Number.isFinite(status)) {
    return Math.trunc(status);
  }

  return undefined;
}

function validateLoginConfigInProduction(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const missing: string[] = [];
  const hasTurnstileSecret = Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
  const hasSupabaseUrl = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim(),
  );
  const hasSupabaseAnonKey = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim(),
  );
  const hasSupabaseServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

  if (!hasTurnstileSecret) {
    missing.push("TURNSTILE_SECRET_KEY");
  }
  if (!hasSupabaseUrl) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL_OR_SUPABASE_URL");
  }
  if (!hasSupabaseAnonKey) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY_OR_SUPABASE_ANON_KEY");
  }
  if (!hasSupabaseServiceRoleKey) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (missing.length > 0) {
    throw new ApiRouteError({
      status: 500,
      code: "AUTH_LOGIN_CONFIG_ERROR",
      message: "Login service is temporarily unavailable.",
      details: {
        missing,
      },
    });
  }
}

function classifyLoginErrorEventType(error: unknown, httpStatus: number): string | null {
  const errorCode = resolveErrorCode(error);
  const errorMessage = resolveErrorMessage(error);

  if (errorCode === "AUTH_LOGIN_CONFIG_ERROR" || errorCode === "TURNSTILE_MISCONFIGURED") {
    return "auth_login_config_error";
  }

  if (
    errorMessage.includes("Missing required Supabase environment variable") ||
    errorMessage.includes("Missing required Supabase service environment variable")
  ) {
    return "auth_login_config_error";
  }

  if (errorCode === "TURNSTILE_INVALID" || errorCode === "TURNSTILE_EXPIRED") {
    return "turnstile_verification_failed";
  }

  if (errorCode === "TURNSTILE_UNAVAILABLE") {
    return "turnstile_verification_error";
  }

  if (httpStatus >= 500) {
    return "auth_login_error";
  }

  return null;
}

async function logLoginError(params: {
  request: Request;
  eventType: string;
  error: unknown;
  httpStatus: number;
  ip: string | undefined;
  userAgent: string | undefined;
  context: LoginErrorContext;
}): Promise<void> {
  const metadata: Record<string, unknown> = {
    route: LOGIN_ROUTE,
    method: "POST",
    environment: resolveEnvironment(),
    hasTurnstileToken: params.context.hasTurnstileToken,
    userAgent: truncateUserAgent(params.userAgent),
    ipHash: hashIpAddress(params.ip),
    errorName: resolveErrorName(params.error),
    errorCode: resolveErrorCode(params.error),
  };

  if (typeof params.context.turnstileSuccess === "boolean") {
    metadata.turnstileSuccess = params.context.turnstileSuccess;
  }

  if (typeof params.context.turnstileStatusCode === "number") {
    metadata.turnstileStatusCode = params.context.turnstileStatusCode;
  }

  try {
    await logError({
      source: "api.auth",
      eventType: params.eventType,
      message: "Login API failed",
      httpStatus: params.httpStatus,
      errorMessage: resolveErrorMessage(params.error),
      stackTrace: resolveStackTrace(params.error),
      requestId: resolveRequestId(params.request),
      metadata,
    });
  } catch {
    // Do not interrupt the login response flow if logging fails.
  }
}

async function logLoginSuccess(params: {
  request: Request;
  ip: string | undefined;
  userAgent: string | undefined;
  userId: string;
  hasTurnstileToken: boolean;
}): Promise<void> {
  try {
    await logInfo({
      source: "api.auth",
      eventType: "auth_login_success",
      message: "Login API succeeded",
      httpStatus: 200,
      userId: params.userId,
      requestId: resolveRequestId(params.request),
      metadata: {
        route: LOGIN_ROUTE,
        method: "POST",
        environment: resolveEnvironment(),
        hasTurnstileToken: params.hasTurnstileToken,
        turnstileSuccess: true,
        userAgent: truncateUserAgent(params.userAgent),
        ipHash: hashIpAddress(params.ip),
      },
    });
  } catch {
    // Do not interrupt the login response flow if logging fails.
  }
}

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
  let ip: string | undefined;
  let userAgent: string | undefined;
  const errorContext: LoginErrorContext = {
    hasTurnstileToken: false,
  };

  try {
    validateLoginConfigInProduction();

    const queryViolationResponse = await rejectIfSensitiveQueryParams(request);
    if (queryViolationResponse) {
      return queryViolationResponse;
    }

    const payload = await parseLoginPayload(request);
    const email = normalizeEmail(payload.email);
    errorContext.hasTurnstileToken = payload.turnstileToken.trim().length > 0;
    ip = getRequestIp(request);
    userAgent = getRequestUserAgent(request);

    let turnstileResult;

    try {
      turnstileResult = await verifyTurnstileToken({
        token: payload.turnstileToken,
        remoteIp: ip,
      });
      errorContext.turnstileSuccess = turnstileResult.success;
    } catch (error) {
      errorContext.turnstileSuccess = false;
      errorContext.turnstileStatusCode = extractTurnstileStatusCode(error);
      throw error;
    }

    if (!turnstileResult.success) {
      errorContext.turnstileSuccess = false;
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

    await logLoginSuccess({
      request,
      ip,
      userAgent,
      userId: user.id,
      hasTurnstileToken: errorContext.hasTurnstileToken,
    });

    return ok({
      authenticated: true,
      redirectTo: decision.redirectTo,
      sessionMode: decision.sessionMode,
      warningMessage: decision.warningMessage,
      daysUntilExpiration: decision.daysUntilExpiration,
    });
  } catch (error) {
    const response = handleRouteError(error);
    const status = response.status;
    const eventType = classifyLoginErrorEventType(error, status);

    if (eventType) {
      await logLoginError({
        request,
        eventType,
        error,
        httpStatus: status,
        ip,
        userAgent,
        context: errorContext,
      });
    }

    if (error instanceof ApiRouteError) {
      if (error.status >= 500) {
        return fail(
          {
            code: "INTERNAL_SERVER_ERROR",
            message: "Unexpected server error.",
          },
          { status: 500 },
        );
      }

      return fail(
        {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        { status: error.status },
      );
    }

    return response;
  }
}

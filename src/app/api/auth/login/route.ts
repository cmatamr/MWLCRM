import { z } from "zod";

import { isProfileAllowed } from "@/lib/auth/profile";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fail, handleRouteError, ok, ApiRouteError } from "@/server/api/http";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  turnstileToken: z.string().trim().min(1),
});

function getRequestIp(request: Request): string | undefined {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();

    if (first) {
      return first;
    }
  }

  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  return cfIp || undefined;
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

function mapSupabaseLoginError(message: string): ApiRouteError {
  const lowered = message.toLowerCase();

  if (lowered.includes("invalid login credentials")) {
    return new ApiRouteError({
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "Correo o contrasena incorrectos.",
    });
  }

  if (lowered.includes("email not confirmed")) {
    return new ApiRouteError({
      status: 401,
      code: "EMAIL_NOT_CONFIRMED",
      message: "Tu correo aun no esta confirmado en Supabase Auth.",
    });
  }

  if (lowered.includes("too many requests")) {
    return new ApiRouteError({
      status: 429,
      code: "TOO_MANY_REQUESTS",
      message: "Demasiados intentos. Espera un momento e intenta de nuevo.",
    });
  }

  return new ApiRouteError({
    status: 401,
    code: "LOGIN_FAILED",
    message: `No se pudo iniciar sesion: ${message}`,
  });
}

export async function POST(request: Request) {
  try {
    const payload = loginSchema.parse(await request.json());

    const turnstileResult = await verifyTurnstileToken({
      token: payload.turnstileToken,
      remoteIp: getRequestIp(request),
    });

    if (!turnstileResult.success) {
      throw mapTurnstileErrors(turnstileResult.errorCodes);
    }

    const supabase = await createSupabaseServerClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: payload.email,
      password: payload.password,
    });

    if (signInError) {
      throw mapSupabaseLoginError(signInError.message);
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new ApiRouteError({
        status: 401,
        code: "LOGIN_FAILED",
        message: "No se pudo iniciar sesion.",
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("app_user_profiles")
      .select("role, is_active, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new ApiRouteError({
        status: 500,
        code: "PROFILE_LOOKUP_FAILED",
        message: "Could not validate internal user profile.",
      });
    }

    if (!isProfileAllowed(profile)) {
      await supabase.auth.signOut();

      throw new ApiRouteError({
        status: 403,
        code: "PROFILE_ACCESS_DENIED",
        message: "Acceso denegado: tu perfil interno no esta activo o autorizado.",
      });
    }

    return ok({
      authenticated: true,
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

    return handleRouteError(error);
  }
}

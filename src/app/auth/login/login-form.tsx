"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";

type LoginFormProps = {
  nextPath: string;
};

type TurnstileStatus = "idle" | "verified" | "expired" | "error";

type ApiErrorPayload = {
  code?: string;
  message?: string;
};

type LoginApiResponse =
  | {
      success: true;
      data: {
        authenticated: true;
        redirectTo: string;
        sessionMode: "normal" | "password_change_only";
        warningMessage?: string;
        daysUntilExpiration?: number;
      };
    }
  | {
      success: false;
      error?: ApiErrorPayload;
    };

type TurnstileClient = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  reset: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileClient;
  }
}

function resolveSafeNextPath(value: string): string {
  if (!value.startsWith("/")) {
    return "/dashboard";
  }

  if (value.startsWith("/auth")) {
    return "/dashboard";
  }

  return value;
}

function mapLoginApiError(error: ApiErrorPayload | undefined): string {
  if (!error?.code) {
    return error?.message ?? "No se pudo iniciar sesion. Intenta de nuevo.";
  }

  switch (error.code) {
    case "INVALID_CREDENTIALS":
      return "Correo o contrasena incorrectos.";
    case "EMAIL_NOT_CONFIRMED":
      return "Tu correo aun no esta confirmado en Supabase Auth.";
    case "TOO_MANY_REQUESTS":
      return "Demasiados intentos. Espera un momento e intenta de nuevo.";
    case "TURNSTILE_EXPIRED":
      return "El captcha expiro. Completa el captcha de nuevo.";
    case "TURNSTILE_INVALID":
      return "Captcha invalido. Intenta nuevamente.";
    case "TURNSTILE_UNAVAILABLE":
      return "Error temporal validando captcha. Intenta de nuevo en unos segundos.";
    case "TURNSTILE_MISCONFIGURED":
      return "Captcha no disponible temporalmente. Contacta al administrador.";
    case "PROFILE_ACCESS_DENIED":
      return "Acceso denegado: tu perfil interno no esta activo o autorizado.";
    case "ACCOUNT_LOCKED":
      return "Tu cuenta fue bloqueada por seguridad. Restablece tu contrasena para continuar.";
    case "SERVICE_ACCOUNT_RESTRICTED":
      return "Cuenta de servicio sin acceso al dashboard.";
    case "INVALID_AUTH_REQUEST":
      return "Solicitud rechazada por seguridad. No se permite enviar credenciales en URL.";
    case "PASSWORD_EXPIRED":
      return "Tu contrasena vencio. Debes cambiarla para continuar.";
    default:
      return error.message ?? "No se pudo iniciar sesion. Intenta de nuevo.";
  }
}

function getMissingTokenMessage(status: TurnstileStatus): string {
  if (status === "expired") {
    return "El captcha expiro. Completa el captcha de nuevo.";
  }

  if (status === "error") {
    return "Hubo un error en el captcha. Intenta resolverlo nuevamente.";
  }

  return "Completa el captcha antes de continuar.";
}

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isTurnstileScriptReady, setIsTurnstileScriptReady] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileStatus, setTurnstileStatus] = useState<TurnstileStatus>("idle");
  const [showInlinePasswordResetLink, setShowInlinePasswordResetLink] = useState(false);

  useEffect(() => {
    if (!siteKey || !isTurnstileScriptReady || !turnstileContainerRef.current || !window.turnstile) {
      return;
    }

    if (turnstileWidgetIdRef.current) {
      return;
    }

    turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
      sitekey: siteKey,
      callback: (token) => {
        setTurnstileToken(token);
        setTurnstileStatus("verified");
      },
      "expired-callback": () => {
        setTurnstileToken(null);
        setTurnstileStatus("expired");
      },
      "error-callback": () => {
        setTurnstileToken(null);
        setTurnstileStatus("error");
      },
    });
  }, [isTurnstileScriptReady, siteKey]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!siteKey) {
      setErrorMessage("Captcha no disponible temporalmente. Contacta al administrador.");
      return;
    }

    if (!turnstileToken) {
      setErrorMessage(getMissingTokenMessage(turnstileStatus));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          turnstileToken,
        }),
      });

      const payload = (await response.json()) as LoginApiResponse;

      if (!response.ok || !payload.success) {
        const errorCode = payload.success ? undefined : payload.error?.code;
        setIsSubmitting(false);
        setShowInlinePasswordResetLink(errorCode === "INVALID_CREDENTIALS");
        setErrorMessage(mapLoginApiError(payload.success ? undefined : payload.error));

        if (window.turnstile && turnstileWidgetIdRef.current) {
          window.turnstile.reset(turnstileWidgetIdRef.current);
        }

        setTurnstileToken(null);
        setTurnstileStatus("idle");
        return;
      }

      const redirectTo = payload.data.redirectTo
        ? resolveSafeNextPath(payload.data.redirectTo)
        : resolveSafeNextPath(nextPath);

      router.replace(redirectTo);
      router.refresh();
    } catch {
      setIsSubmitting(false);
      setErrorMessage("No se pudo iniciar sesion por un error inesperado. Intenta de nuevo.");
    }
  }

  async function onRequestPasswordReset() {
    setErrorMessage(null);
    setInfoMessage(null);

    if (!email.trim()) {
      setErrorMessage("Ingresa tu correo para solicitar el reset.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        setIsSubmitting(false);
        setErrorMessage(payload?.error?.message ?? "No se pudo solicitar reset de contrasena.");
        return;
      }

      setInfoMessage(
        payload?.data?.message ??
          "Si el correo existe, recibiras un enlace para restablecer tu contrasena.",
      );
      setIsSubmitting(false);
    } catch {
      setIsSubmitting(false);
      setErrorMessage("No se pudo solicitar reset de contrasena.");
    }
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
        onLoad={() => setIsTurnstileScriptReady(true)}
        onError={() => {
          setTurnstileStatus("error");
          setErrorMessage("No se pudo cargar el captcha. Recarga la pagina e intenta de nuevo.");
        }}
      />

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Correo
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-2xl border border-border/80 bg-white px-4 py-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/65 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
            placeholder="tu@empresa.com"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-2xl border border-border/80 bg-white px-4 py-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/65 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
            placeholder="••••••••"
          />
        </div>

        <div className="rounded-2xl border border-border/70 bg-secondary/30 p-3">
          <div ref={turnstileContainerRef} className="min-h-[65px]" />
          {!isTurnstileScriptReady ? (
            <p className="mt-1 text-xs text-muted-foreground">Cargando captcha...</p>
          ) : null}
          {turnstileStatus === "expired" ? (
            <p className="mt-1 text-xs text-amber-700">El captcha expiro. Completa el captcha de nuevo.</p>
          ) : null}
          {turnstileStatus === "error" ? (
            <p className="mt-1 text-xs text-red-700">
              El captcha presento un error. Intenta recargar la pagina.
            </p>
          ) : null}
        </div>

        {errorMessage ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {infoMessage ? (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {infoMessage}
          </p>
        ) : null}

        <div className="space-y-2">
          <Button
            type="submit"
            className="w-full rounded-2xl border border-[#2b4f7a]/70 bg-[linear-gradient(135deg,#0c2d57_0%,#165085_100%)] py-6 text-sm font-semibold text-white shadow-[0_12px_28px_-14px_rgba(2,6,23,0.75)] hover:brightness-110"
            disabled={isSubmitting || !siteKey}
          >
            {isSubmitting ? "Ingresando..." : "Ingresar"}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          ¿Problemas para ingresar?{" "}
          {showInlinePasswordResetLink ? (
            <>
              <button
                type="button"
                onClick={onRequestPasswordReset}
                disabled={isSubmitting}
                className="font-medium text-slate-700 underline decoration-slate-400 underline-offset-2 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Restablece tu contrasena
              </button>{" "}
              o{" "}
            </>
          ) : null}
          Contacta al administrador.
        </p>
      </form>
    </>
  );
}

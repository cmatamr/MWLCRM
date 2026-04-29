"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type RecoverStatus = "processing" | "error";

function getErrorMessage(input: string | null): string {
  const text = (input ?? "").toLowerCase();

  if (text.includes("otp_expired") || text.includes("invalid") || text.includes("expired")) {
    return "El enlace de restablecimiento es inválido o expiró. Solicita uno nuevo en el login.";
  }

  return "No se pudo validar el enlace de restablecimiento. Solicita uno nuevo e intenta otra vez.";
}

export default function RecoverPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [status, setStatus] = useState<RecoverStatus>("processing");
  const [message, setMessage] = useState("Validando enlace de restablecimiento...");

  useEffect(() => {
    let active = true;

    async function run() {
      const url = new URL(window.location.href);
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
      const queryParams = url.searchParams;

      const hashError = hashParams.get("error") || hashParams.get("error_description");
      if (hashError) {
        if (!active) {
          return;
        }

        setStatus("error");
        setMessage(getErrorMessage(hashError));
        return;
      }

      const code = queryParams.get("code");
      const tokenHash = queryParams.get("token_hash");
      const type = queryParams.get("type");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      try {
        if (!code && !tokenHash && !accessToken) {
          throw new Error("missing_recovery_token");
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            throw error;
          }
        } else if (tokenHash && type) {
          if (type !== "recovery") {
            throw new Error("invalid_recovery_type");
          }

          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });
          if (error) {
            throw error;
          }
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            throw error;
          }
        }

        if (!active) {
          return;
        }

        setMessage("Enlace validado. Redirigiendo para definir tu nueva contraseña...");
        router.replace("/account/security/change-password");
        router.refresh();
      } catch (error) {
        if (!active) {
          return;
        }

        const detail = error instanceof Error ? error.message : null;
        setStatus("error");
        setMessage(getErrorMessage(detail));
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center justify-center px-6 py-12">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Restablecer contraseña</h1>
        <p
          className={`mt-3 text-sm ${status === "error" ? "text-red-700" : "text-slate-600"}`}
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      </div>
    </section>
  );
}

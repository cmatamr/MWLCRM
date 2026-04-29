"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AccountSecurityApiResponse =
  | {
      success: true;
      data: {
        passwordResetRequired: boolean;
        daysUntilExpiration: number | null;
        policy: {
          minimumLength: number;
          minimumUppercase: number;
          minimumLowercase: number;
          minimumNumbers: number;
          minimumSymbols: number;
          passwordHistoryCheckCount: number;
        };
      };
    }
  | {
      success: false;
      error?: {
        message?: string;
      };
    };

export function ChangePasswordForm() {
  const [policy, setPolicy] = useState({
    minimumLength: 8,
    minimumUppercase: 1,
    minimumLowercase: 1,
    minimumNumbers: 1,
    minimumSymbols: 1,
    passwordHistoryCheckCount: 3,
  });
  const [currentPasswordRequired, setCurrentPasswordRequired] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const uppercaseCount = (newPassword.match(/[A-Z]/g) ?? []).length;
  const lowercaseCount = (newPassword.match(/[a-z]/g) ?? []).length;
  const numbersCount = (newPassword.match(/[0-9]/g) ?? []).length;
  const symbolsCount = (newPassword.match(/[^A-Za-z0-9]/g) ?? []).length;

  const passwordRequirements = [
    {
      id: "length",
      label: `Mínimo ${policy.minimumLength} caracteres.`,
      met: newPassword.length >= policy.minimumLength,
    },
    {
      id: "uppercase",
      label: `Al menos ${policy.minimumUppercase} mayúscula(s).`,
      met: uppercaseCount >= policy.minimumUppercase,
    },
    {
      id: "lowercase",
      label: `Al menos ${policy.minimumLowercase} minúscula(s).`,
      met: lowercaseCount >= policy.minimumLowercase,
    },
    {
      id: "numbers",
      label: `Al menos ${policy.minimumNumbers} número(s).`,
      met: numbersCount >= policy.minimumNumbers,
    },
    {
      id: "symbols",
      label: `Al menos ${policy.minimumSymbols} símbolo(s).`,
      met: symbolsCount >= policy.minimumSymbols,
    },
    {
      id: "history",
      label: `No reutilizar las últimas ${policy.passwordHistoryCheckCount} contraseña(s).`,
      met: false,
      onlyServerSide: true,
    },
  ] as const;

  useEffect(() => {
    let active = true;

    async function loadSecurityState() {
      try {
        const response = await fetch("/api/account/security", { method: "GET" });
        const payload = (await response.json()) as AccountSecurityApiResponse;

        if (!active || !response.ok || !payload.success) {
          return;
        }

        const mustReset = payload.data.passwordResetRequired;
        const days = payload.data.daysUntilExpiration;
        const expired = days == null || days <= 0;

        setCurrentPasswordRequired(!(mustReset || expired));
        setPolicy(payload.data.policy);
      } catch {
        // Keep secure default: require current password if we cannot determine state.
      }
    }

    void loadSecurityState();

    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("La confirmacion no coincide.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/account/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: currentPasswordRequired ? currentPassword : undefined,
          newPassword,
          confirmPassword,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        setLoading(false);
        setError(payload?.error?.message ?? "No se pudo cambiar la contrasena.");
        return;
      }

      setSuccess("Contrasena actualizada correctamente.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      router.replace(payload?.data?.redirectTo ?? "/dashboard");
      router.refresh();
    } catch {
      setLoading(false);
      setError("No se pudo cambiar la contrasena.");
    }
  }

  return (
    <form onSubmit={onSubmit} method="post" action="/account/security/change-password" className="space-y-5">
      <div className="rounded-[22px] border border-primary/15 bg-white/85 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">Seguridad</p>
        <p className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Requerimientos mínimos de contraseña</p>
        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          {passwordRequirements.map((requirement) => (
            <li key={requirement.id} className="flex items-start gap-2">
              <span
                aria-hidden="true"
                className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                  requirement.met ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {requirement.met ? "✓" : "•"}
              </span>
              <span className={requirement.met ? "text-emerald-800" : "text-slate-700"}>{requirement.label}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          La regla de historial se valida al guardar, porque depende del servidor.
        </p>
      </div>

      {currentPasswordRequired ? (
        <div className="space-y-1.5">
          <label htmlFor="currentPassword" className="text-sm font-medium text-foreground">
            Contrasena actual
          </label>
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-border/80 bg-white px-4 py-3 text-sm text-foreground"
            placeholder="••••••••"
          />
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="newPassword" className="text-sm font-medium text-foreground">
          Nueva contraseña
        </label>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          required
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          disabled={loading}
          className="w-full rounded-xl border border-border/80 bg-white px-4 py-3 text-sm text-foreground"
          placeholder="••••••••"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
          Confirmar contraseña
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={loading}
          className="w-full rounded-xl border border-border/80 bg-white px-4 py-3 text-sm text-foreground"
          placeholder="••••••••"
        />
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="submit"
          className="inline-flex rounded-full bg-primary px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
          disabled={loading}
        >
          {loading ? "Guardando..." : "Actualizar Contraseña"}
        </button>
        <Link
          href="/dashboard"
          className={`inline-flex rounded-full border border-border bg-white px-7 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 ${
            loading ? "pointer-events-none opacity-60" : ""
          }`}
          aria-disabled={loading}
          tabIndex={loading ? -1 : 0}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

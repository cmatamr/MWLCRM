"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type AccountSecurityApiResponse =
  | {
      success: true;
      data: {
        passwordResetRequired: boolean;
        daysUntilExpiration: number | null;
      };
    }
  | {
      success: false;
      error?: {
        message?: string;
      };
    };

export function ChangePasswordForm() {
  const [currentPasswordRequired, setCurrentPasswordRequired] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

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

      <button
        type="submit"
        className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
        disabled={loading}
      >
        {loading ? "Guardando..." : "Actualizar Contraseña"}
      </button>
    </form>
  );
}

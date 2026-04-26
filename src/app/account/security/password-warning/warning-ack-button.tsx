"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PasswordWarningAcknowledgeButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onContinue() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/account/password-warning/acknowledge", {
        method: "POST",
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        setLoading(false);
        setError(payload?.error?.message ?? "No se pudo registrar el aviso.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setLoading(false);
      setError("No se pudo registrar el aviso.");
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onContinue}
        disabled={loading}
        className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
      >
        {loading ? "Procesando..." : "Continuar"}
      </button>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}

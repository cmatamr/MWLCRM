"use client";

import { useEffect, useState } from "react";

type Policy = {
  minimum_length: number;
  minimum_uppercase: number;
  minimum_lowercase: number;
  minimum_numbers: number;
  minimum_symbols: number;
  password_history_check_count: number;
  password_history_keep_count: number;
  password_expiration_days: number;
  expiration_warning_days: number;
  failed_login_lock_enabled: boolean;
  max_failed_login_attempts: number;
  hash_algorithm: string;
};

const EMPTY_POLICY: Policy = {
  minimum_length: 8,
  minimum_uppercase: 1,
  minimum_lowercase: 1,
  minimum_numbers: 1,
  minimum_symbols: 1,
  password_history_check_count: 3,
  password_history_keep_count: 5,
  password_expiration_days: 90,
  expiration_warning_days: 7,
  failed_login_lock_enabled: true,
  max_failed_login_attempts: 3,
  hash_algorithm: "argon2id",
};

const UPPERCASE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWERCASE_CHARS = "abcdefghijkmnopqrstuvwxyz";
const NUMBER_CHARS = "23456789";
const SYMBOL_CHARS = "!@#$%^&*()_+-=[]{};:,.?";

function pickRandom(source: string): string {
  if (!source.length) {
    return "";
  }

  const index = Math.floor(Math.random() * source.length);
  return source[index] ?? "";
}

function shuffleChars(chars: string[]): string[] {
  const shuffled = [...chars];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index]!;
    const swapValue = shuffled[swapIndex]!;
    shuffled[index] = swapValue;
    shuffled[swapIndex] = current;
  }

  return shuffled;
}

function generatePasswordFromPolicy(policy: Policy): string {
  const minimumUppercase = Math.max(0, policy.minimum_uppercase);
  const minimumLowercase = Math.max(0, policy.minimum_lowercase);
  const minimumNumbers = Math.max(0, policy.minimum_numbers);
  const minimumSymbols = Math.max(0, policy.minimum_symbols);

  const requiredChars: string[] = [];

  for (let index = 0; index < minimumUppercase; index += 1) {
    requiredChars.push(pickRandom(UPPERCASE_CHARS));
  }

  for (let index = 0; index < minimumLowercase; index += 1) {
    requiredChars.push(pickRandom(LOWERCASE_CHARS));
  }

  for (let index = 0; index < minimumNumbers; index += 1) {
    requiredChars.push(pickRandom(NUMBER_CHARS));
  }

  for (let index = 0; index < minimumSymbols; index += 1) {
    requiredChars.push(pickRandom(SYMBOL_CHARS));
  }

  const minimumLength = Math.max(1, policy.minimum_length);
  const targetLength = Math.max(minimumLength, requiredChars.length);
  const fallbackPool = `${UPPERCASE_CHARS}${LOWERCASE_CHARS}${NUMBER_CHARS}${SYMBOL_CHARS}`;
  const optionalPool = [
    minimumUppercase > 0 ? UPPERCASE_CHARS : "",
    minimumLowercase > 0 ? LOWERCASE_CHARS : "",
    minimumNumbers > 0 ? NUMBER_CHARS : "",
    minimumSymbols > 0 ? SYMBOL_CHARS : "",
  ]
    .join("")
    .trim();
  const randomPool = optionalPool.length ? optionalPool : fallbackPool;

  while (requiredChars.length < targetLength) {
    requiredChars.push(pickRandom(randomPool));
  }

  return shuffleChars(requiredChars).join("");
}

export function PasswordPolicyClient() {
  const [policy, setPolicy] = useState<Policy>(EMPTY_POLICY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  async function loadPolicy() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/security/password-policy");
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        setLoading(false);
        setError(payload?.error?.message ?? "No se pudo cargar politica.");
        return;
      }

      setPolicy(payload.data.policy);
      setLoading(false);
    } catch {
      setLoading(false);
      setError("No se pudo cargar politica.");
    }
  }

  useEffect(() => {
    void loadPolicy();
  }, []);

  function setNumberField(field: keyof Policy, value: string) {
    const parsed = Number.parseInt(value, 10);
    setPolicy((current) => ({
      ...current,
      [field]: Number.isNaN(parsed) ? 0 : parsed,
    }));
  }

  async function savePolicy() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/security/password-policy", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          minimum_length: policy.minimum_length,
          minimum_uppercase: policy.minimum_uppercase,
          minimum_lowercase: policy.minimum_lowercase,
          minimum_numbers: policy.minimum_numbers,
          minimum_symbols: policy.minimum_symbols,
          password_history_check_count: policy.password_history_check_count,
          password_history_keep_count: policy.password_history_keep_count,
          password_expiration_days: policy.password_expiration_days,
          expiration_warning_days: policy.expiration_warning_days,
          max_failed_login_attempts: policy.max_failed_login_attempts,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        setSaving(false);
        setError(payload?.error?.message ?? "No se pudo guardar politica.");
        return;
      }

      setPolicy(payload.data.policy);
      setSuccess("Politica actualizada correctamente.");
      setSaving(false);
    } catch {
      setSaving(false);
      setError("No se pudo guardar politica.");
    }
  }

  async function resetDefaults() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/security/password-policy/reset-defaults", {
        method: "POST",
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        setSaving(false);
        setError(payload?.error?.message ?? "No se pudo resetear politica.");
        return;
      }

      setPolicy(payload.data.policy);
      setSuccess("Politica restablecida a valores por defecto.");
      setSaving(false);
    } catch {
      setSaving(false);
      setError("No se pudo resetear politica.");
    }
  }

  async function forceResetUsers() {
    const confirmed = window.confirm(
      "Esto forzara reset de contrasena para usuarios admin/user activos. Deseas continuar?",
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/security/password-policy/force-reset-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirm: true,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        setSaving(false);
        setError(payload?.error?.message ?? "No se pudo ejecutar force reset.");
        return;
      }

      setSuccess(`Force reset aplicado a ${payload.data.affectedUsers} usuario(s).`);
      setSaving(false);
    } catch {
      setSaving(false);
      setError("No se pudo ejecutar force reset.");
    }
  }

  function testRule() {
    const generated = generatePasswordFromPolicy(policy);
    setGeneratedPassword(generated);
    setSuccess("Contrasena de prueba generada con la regla actual.");
    setError(null);
  }

  return (
    <div className="dashboard-card-3d p-6">
      {loading ? <p className="text-sm text-slate-600">Cargando politica...</p> : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-1 text-sm">Mínimo longitud
          <input type="number" value={policy.minimum_length} onChange={(e) => setNumberField("minimum_length", e.target.value)} className="w-full rounded-xl border border-border bg-white px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm">Minimo mayusculas
          <input type="number" value={policy.minimum_uppercase} onChange={(e) => setNumberField("minimum_uppercase", e.target.value)} className="w-full rounded-xl border border-border bg-white px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm">Mínimo minusculas
          <input type="number" value={policy.minimum_lowercase} onChange={(e) => setNumberField("minimum_lowercase", e.target.value)} className="w-full rounded-xl border border-border bg-white px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm">Minimo numeros
          <input type="number" value={policy.minimum_numbers} onChange={(e) => setNumberField("minimum_numbers", e.target.value)} className="w-full rounded-xl border border-border bg-white px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm">Mínimo simbolos
          <input type="number" value={policy.minimum_symbols} onChange={(e) => setNumberField("minimum_symbols", e.target.value)} className="w-full rounded-xl border border-border bg-white px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm">Historial (validar N)
          <input type="number" value={policy.password_history_check_count} onChange={(e) => setNumberField("password_history_check_count", e.target.value)} className="w-full rounded-xl border border-border bg-white px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm">Historial (guardar N)
          <input type="number" value={policy.password_history_keep_count} onChange={(e) => setNumberField("password_history_keep_count", e.target.value)} className="w-full rounded-xl border border-border bg-white px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm">Expiración (días)
          <input type="number" value={policy.password_expiration_days} onChange={(e) => setNumberField("password_expiration_days", e.target.value)} className="w-full rounded-xl border border-border bg-white px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm">Aviso previo (días)
          <input type="number" value={policy.expiration_warning_days} onChange={(e) => setNumberField("expiration_warning_days", e.target.value)} className="w-full rounded-xl border border-border bg-white px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm">Max intentos fallidos
          <input type="number" value={policy.max_failed_login_attempts} onChange={(e) => setNumberField("max_failed_login_attempts", e.target.value)} className="w-full rounded-xl border border-border bg-white px-3 py-2" />
        </label>
        <label className="space-y-1 text-sm">Algoritmo hash
          <input value={policy.hash_algorithm} readOnly className="w-full rounded-xl border border-border bg-slate-100 px-3 py-2" />
        </label>
      </div>

      {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
      {generatedPassword ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Password de prueba</p>
          <p className="mt-1 break-all font-mono text-sm text-slate-900">{generatedPassword}</p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={savePolicy} disabled={saving} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white">{saving ? "Guardando..." : "Guardar politica"}</button>
        <button type="button" onClick={testRule} disabled={saving} className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-800">Test Rule</button>
        <button type="button" onClick={resetDefaults} disabled={saving} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Reset defaults</button>
        <button type="button" onClick={forceResetUsers} disabled={saving} className="rounded-xl border border-amber-400 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800">Force reset users</button>
      </div>
    </div>
  );
}

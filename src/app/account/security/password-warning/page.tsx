import Link from "next/link";
import { redirect } from "next/navigation";

import { PasswordWarningAcknowledgeButton } from "@/app/account/security/password-warning/warning-ack-button";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getActivePasswordPolicy,
  getDaysUntilExpiration,
  getPasswordWarningMessage,
} from "@/server/security";

export default async function PasswordWarningPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const service = createSupabaseServiceClient();
  const policy = await getActivePasswordPolicy(service);
  const { data: profile } = await service
    .from("app_user_profiles")
    .select("role, password_expires_at, password_reset_required")
    .eq("id", user.id)
    .maybeSingle<{
      role: string;
      password_expires_at: string | null;
      password_reset_required: boolean;
    }>();

  if (!profile || profile.role === "service") {
    redirect("/auth/access-denied");
  }

  const daysUntilExpiration = getDaysUntilExpiration(profile.password_expires_at);
  const expired =
    profile.password_reset_required || daysUntilExpiration == null || daysUntilExpiration <= 0;

  if (!expired && daysUntilExpiration > policy.expiration_warning_days) {
    redirect("/dashboard");
  }

  const message = expired
    ? "Tu contraseña venció. Debes cambiarla para continuar."
    : getPasswordWarningMessage(daysUntilExpiration);

  return (
    <section className="dashboard-card-3d mx-auto max-w-2xl p-8 md:p-10">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Seguridad</p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-900">Aviso de contraseña</h1>

      <p className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">{message}</p>

      <p className="mt-5 text-sm text-slate-600">
        Por seguridad, deberas actualizar tu contraseña antes de que expire. Puedes cambiarla ahora o
        continuar al CRM.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/account/security/change-password"
          className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
        >
          Cambiar contraseña
        </Link>

        {expired ? null : <PasswordWarningAcknowledgeButton />}
      </div>
    </section>
  );
}

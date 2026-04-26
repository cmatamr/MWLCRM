import { redirect } from "next/navigation";

import { ChangePasswordForm } from "@/app/account/security/change-password/change-password-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ChangePasswordPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <section className="dashboard-card-3d mx-auto max-w-2xl p-8 md:p-10">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Seguridad</p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-900">Cambiar contraseña</h1>
      <p className="mt-3 text-sm text-slate-600">
        Actualiza tu contraseña para mantener la cuenta protegida y recuperar acceso completo al CRM.
      </p>

      <div className="mt-8">
        <ChangePasswordForm />
      </div>
    </section>
  );
}

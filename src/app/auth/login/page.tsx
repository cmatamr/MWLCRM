import Link from "next/link";
import { redirect } from "next/navigation";

import { isProfileAllowed } from "@/lib/auth/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LoginForm } from "@/app/auth/login/login-form";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string | string[];
  }>;
};

function getNextPath(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "/dashboard";
  }

  return value ?? "/dashboard";
}

function toSafeInternalPath(path: string): string {
  if (!path.startsWith("/")) {
    return "/dashboard";
  }

  if (path.startsWith("/auth")) {
    return "/dashboard";
  }

  return path;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const requestedNextPath = toSafeInternalPath(getNextPath(params.next));

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("app_user_profiles")
      .select("role, is_active, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (isProfileAllowed(profile)) {
      redirect(requestedNextPath);
    }

    redirect("/auth/access-denied");
  }

  return (
    <div className="mx-auto flex w-full max-w-xl items-center justify-center py-12">
      <section className="w-full rounded-3xl border border-white/70 bg-white/85 p-7 shadow-panel backdrop-blur">
        <div className="mb-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
            Made With Love CRM
          </p>
          <h2 className="font-serif text-3xl font-semibold tracking-tight text-slate-900">
            Iniciar sesión
          </h2>
          <p className="text-sm text-slate-600">
            Acceso exclusivo para usuarios internos autorizados.
          </p>
        </div>

        <LoginForm nextPath={requestedNextPath} />

        <p className="mt-4 text-xs text-slate-500">
          Si no puedes ingresar, confirma en Supabase que tu usuario exista y tenga perfil activo
          en <code className="rounded bg-slate-100 px-1 py-0.5">public.app_user_profiles</code>.
        </p>

        <div className="mt-6 text-sm">
          <Link href="/auth/access-denied" className="text-primary underline underline-offset-4">
            ¿Tu acceso fue bloqueado?
          </Link>
        </div>
      </section>
    </div>
  );
}

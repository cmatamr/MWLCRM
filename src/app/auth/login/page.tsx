import Image from "next/image";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/auth/login/login-form";
import { isProfileAllowed } from "@/lib/auth/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
    <div className="relative mx-auto flex w-full items-center justify-center py-8 md:py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(9,114,139,0.08),transparent_42%)]" />

      <section className="w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/60 bg-white/85 shadow-[0_42px_86px_-34px_rgba(2,6,23,0.52),0_18px_36px_-18px_rgba(2,6,23,0.38)] backdrop-blur">
        <div className="grid min-h-[700px] grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
          <aside className="relative order-2 flex flex-col justify-between overflow-hidden bg-[radial-gradient(circle_at_18%_10%,rgba(14,116,144,0.24),transparent_38%),radial-gradient(circle_at_85%_92%,rgba(56,189,248,0.2),transparent_44%),linear-gradient(165deg,#020617_0%,#020b22_56%,#03123a_100%)] p-8 text-white md:p-10 lg:order-1 lg:px-12 lg:py-10">
            <div className="pointer-events-none absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-40px_90px_rgba(2,6,23,0.45)]" />
            <div className="pointer-events-none absolute inset-[1px] rounded-[calc(2rem-1px)] border border-white/10" />
            <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-52 w-52 rounded-full bg-black/15 blur-2xl" />

            <div className="relative mx-auto w-full max-w-[560px] space-y-14">
              <div className="space-y-5">
                <div className="h-[150px] w-full max-w-[520px] overflow-hidden">
                  <Image
                    src="/nexacore-logo.png"
                    alt="NexaCore by 4 + [ UNO ]"
                    width={1536}
                    height={1024}
                    priority
                    className="-mt-24 h-auto w-full"
                  />
                </div>

                <div className="max-w-[500px] space-y-3">
                  <h2 className="text-2xl font-semibold leading-tight md:text-3xl">
                    Gestión comercial centralizada
                  </h2>
                  <p className="text-sm text-white/85 md:text-base">
                    Seguimiento, ventas y análisis en un solo lugar.
                  </p>
                </div>
              </div>

              <ul className="max-w-[500px] space-y-3 text-sm text-white/90 md:text-base">
                <li className="flex items-center gap-3">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/35 text-[10px]">
                    ●
                  </span>
                  Seguimiento de clientes
                </li>
                <li className="flex items-center gap-3">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/35 text-[10px]">
                    ●
                  </span>
                  Recuperación de leads perdidos
                </li>
                <li className="flex items-center gap-3">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/35 text-[10px]">
                    ●
                  </span>
                  Análisis de ingresos
                </li>
              </ul>
            </div>

            <div className="relative mt-12 border-t border-white/25 pt-6 text-sm text-white/80">
              <p className="font-medium text-white/90">Workspace activo</p>
              <p className="mt-1 text-white">Made With Love</p>
            </div>
          </aside>

          <div className="order-1 flex flex-col justify-center bg-gradient-to-b from-white via-white to-secondary/40 p-7 md:p-10 lg:order-2 lg:p-12">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8 space-y-2">
                <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  Iniciar sesión
                </h1>
                <p className="text-sm text-muted-foreground md:text-base">
                  Accede a tu espacio de trabajo
                </p>
              </div>

              <LoginForm nextPath={requestedNextPath} />

              <p className="mt-6 text-sm text-muted-foreground">
                ¿Problemas para ingresar? Contacta al administrador.
              </p>

              <div className="mt-6 border-t border-border/80 pt-4">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground/90">
                  Powered by NexaCore®
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

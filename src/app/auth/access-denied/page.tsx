import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function AccessDeniedPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl items-center justify-center py-12">
      <section className="w-full rounded-3xl border border-white/70 bg-white/85 p-7 shadow-panel backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
          OntraOne by 4 + [ UNO ]
        </p>
        <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">
          Acceso denegado
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Tu cuenta no tiene un perfil interno activo en el CRM. Solicita revisión a un
          administrador y vuelve a intentar.
        </p>

        <div className="mt-6 flex justify-center">
          <Button asChild>
            <Link href="/auth/login">Aceptar</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

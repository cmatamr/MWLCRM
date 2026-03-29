import { ArrowUpRight, Clock3, Wallet } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { formatCurrencyCRC, formatDateTime } from "@/lib/formatters";

type ModulePlaceholderProps = {
  title: string;
  description: string;
  highlight: string;
};

export function ModulePlaceholder({
  title,
  description,
  highlight,
}: ModulePlaceholderProps) {
  return (
    <section className="space-y-6">
      <PageHeader title={title} description={description} />

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <article className="overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-panel">
          <div className="bg-hero-grid p-6 md:p-8">
            <div className="max-w-2xl space-y-4">
              <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Placeholder productivo
              </span>
              <h3 className="text-balance font-serif text-3xl font-semibold text-slate-950">
                {highlight}
              </h3>
              <p className="text-base leading-7 text-slate-600">{description}</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button>Agregar funcionalidad</Button>
              <Button variant="outline">
                Revisar arquitectura
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </article>

        <article className="grid gap-4">
          <div className="rounded-[24px] border border-border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor de referencia</p>
                <p className="text-2xl font-semibold text-slate-950">
                  {formatCurrencyCRC(2450000)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <Clock3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Última actualización</p>
                <p className="text-base font-semibold text-slate-950">
                  {formatDateTime(new Date())}
                </p>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

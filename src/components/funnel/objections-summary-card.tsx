import type { FunnelSummary } from "@/server/services/funnel/types";

import { formatObjectionLabel } from "./funnel-presenters";

type ObjectionsSummaryCardProps = {
  summary: Pick<FunnelSummary, "totalObjections" | "uniqueObjectionTypes" | "topObjections">;
};

export function ObjectionsSummaryCard({ summary }: ObjectionsSummaryCardProps) {
  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)]">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
          Objeciones
        </p>
        <div className="space-y-1">
          <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
            Resumen de objeciones
          </h3>
          <p className="text-sm leading-6 text-muted-foreground">
            Frecuencia detectada en `conversation_objections`, sin clasificaciones inventadas.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-secondary px-4 py-4 text-secondary-foreground">
          <p className="text-xs uppercase tracking-[0.16em]">Objeciones detectadas</p>
          <p className="mt-2 text-2xl font-semibold">{summary.totalObjections}</p>
        </div>
        <div className="rounded-2xl bg-muted px-4 py-4 text-slate-900">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Tipos/subtipos únicos
          </p>
          <p className="mt-2 text-2xl font-semibold">{summary.uniqueObjectionTypes}</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {summary.topObjections.length > 0 ? (
          summary.topObjections.map((objection) => (
            <article
              key={objection.key}
              className="flex items-center justify-between gap-4 rounded-[24px] border border-border/70 p-4"
            >
              <div>
                <h4 className="font-semibold text-slate-950">{formatObjectionLabel(objection)}</h4>
                <p className="text-sm text-muted-foreground">
                  {objection.affectedLeadCount} leads impactados
                </p>
              </div>
              <div className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                {objection.count}
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[24px] border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
            No hay objeciones registradas todavía.
          </div>
        )}
      </div>
    </section>
  );
}

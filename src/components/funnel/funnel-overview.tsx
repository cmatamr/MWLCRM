import type { FunnelSummary } from "@/server/services/funnel/types";

import { formatStageLabel } from "./funnel-presenters";

type FunnelOverviewProps = {
  summary: Pick<FunnelSummary, "totalLeads" | "activeLeads" | "wonLeads" | "lostLeads" | "stages">;
};

export function FunnelOverview({ summary }: FunnelOverviewProps) {
  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
          Visualización
        </p>
        <div className="space-y-1">
          <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
            Overview del funnel
          </h3>
          <p className="text-sm leading-6 text-muted-foreground">
            Distribución actual de conversaciones por etapa usando el estado real de cada lead.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-slate-950 px-4 py-4 text-white">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Leads</p>
          <p className="mt-2 text-2xl font-semibold">{summary.totalLeads}</p>
        </div>
        <div className="rounded-2xl bg-secondary px-4 py-4 text-secondary-foreground">
          <p className="text-xs uppercase tracking-[0.16em]">Activos</p>
          <p className="mt-2 text-2xl font-semibold">{summary.activeLeads}</p>
        </div>
        <div className="rounded-2xl bg-muted px-4 py-4 text-slate-900">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Ganados</p>
          <p className="mt-2 text-2xl font-semibold">{summary.wonLeads}</p>
        </div>
        <div className="rounded-2xl bg-muted px-4 py-4 text-slate-900">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Perdidos</p>
          <p className="mt-2 text-2xl font-semibold">{summary.lostLeads}</p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-[24px] border border-border/70 bg-muted/20">
        <div className="flex min-h-16 flex-col md:flex-row">
          {summary.stages.map((stage, index) => (
            <div
              key={stage.stage}
              className="flex min-h-16 items-center justify-between gap-3 px-4 py-4 text-sm text-white"
              style={{
                width: `${Math.max(stage.sharePercent, stage.threadCount > 0 ? 12 : 0)}%`,
                background:
                  index % 2 === 0
                    ? "linear-gradient(135deg, hsl(var(--chart-1)), hsl(var(--chart-2)))"
                    : "linear-gradient(135deg, hsl(var(--chart-3)), hsl(var(--chart-5)))",
              }}
            >
              <span className="font-semibold">{formatStageLabel(stage.stage)}</span>
              <span>{stage.threadCount}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-5">
        {summary.stages.map((stage) => (
          <div key={stage.stage} className="rounded-2xl border border-border/70 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {formatStageLabel(stage.stage)}
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{stage.threadCount}</p>
            <p className="text-sm text-muted-foreground">{stage.sharePercent.toFixed(1)}% del total</p>
          </div>
        ))}
      </div>
    </section>
  );
}

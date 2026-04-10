import type { DashboardFunnelOverview } from "@/server/services/dashboard/types";
import { formatCurrencyCRC } from "@/lib/formatters";

type FunnelOverviewCardProps = {
  overview: DashboardFunnelOverview;
};

function formatStageLabel(stage: string) {
  return stage.replaceAll("_", " ");
}

export function FunnelOverviewCard({ overview }: FunnelOverviewCardProps) {
  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)]">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
            Funnel
          </p>
          <div className="space-y-1">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
              Resumen de funnel
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Distribución actual de oportunidades y avance hasta cierre ganado.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-slate-950 px-4 py-4 text-white">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Leads</p>
            <p className="mt-2 text-2xl font-semibold">{overview.totalLeads}</p>
          </div>
          <div className="rounded-2xl bg-secondary px-4 py-4 text-secondary-foreground">
            <p className="text-xs uppercase tracking-[0.18em]">Activos</p>
            <p className="mt-2 text-2xl font-semibold">{overview.activeLeads}</p>
          </div>
          <div className="rounded-2xl bg-muted px-4 py-4 text-slate-900">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Ganados</p>
            <p className="mt-2 text-2xl font-semibold">{overview.wonLeads}</p>
          </div>
          <div className="rounded-2xl bg-muted px-4 py-4 text-slate-900">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Win rate</p>
            <p className="mt-2 text-2xl font-semibold">{overview.winRate.toFixed(1)}%</p>
          </div>
        </div>

        <div className="space-y-3">
          {overview.stages.map((stage) => (
            <article key={stage.stage} className="rounded-[24px] border border-border/70 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="font-semibold capitalize text-slate-950">
                    {formatStageLabel(stage.stage)}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {stage.threadCount} leads, {stage.sharePercent.toFixed(1)}% del funnel
                  </p>
                </div>
                <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                  <p>Tiempo medio: {stage.averageDurationHours.toFixed(1)} h</p>
                  <p>Revenue: {formatCurrencyCRC(stage.revenueCrc)}</p>
                </div>
              </div>

              <div className="mt-4 h-3 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,hsl(var(--chart-1)),hsl(var(--chart-2)))]"
                  style={{ width: `${Math.min(stage.sharePercent, 100)}%` }}
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

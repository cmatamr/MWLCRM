import type { FunnelStageSummary } from "@/server/services/funnel/types";

import { formatDurationHours, formatObjectionLabel, formatStageLabel } from "./funnel-presenters";

type FunnelStageCardProps = {
  stage: FunnelStageSummary;
};

export function FunnelStageCard({ stage }: FunnelStageCardProps) {
  return (
    <article className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
            Etapa
          </p>
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
              {formatStageLabel(stage.stage)}
            </h3>
            <p className="text-sm text-muted-foreground">
              {stage.threadCount} leads, {stage.sharePercent.toFixed(1)}% del funnel actual
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-secondary px-4 py-3 text-right text-secondary-foreground">
          <p className="text-xs uppercase tracking-[0.16em]">Leads</p>
          <p className="mt-1 text-2xl font-semibold">{stage.threadCount}</p>
        </div>
      </div>

      <div className="mt-5 h-3 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,hsl(var(--chart-1)),hsl(var(--chart-2)))]"
          style={{ width: `${Math.min(stage.sharePercent, 100)}%` }}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Tiempo promedio
          </p>
          {stage.durationSampleSize > 0 ? (
            <>
              <p className="mt-2 text-xl font-semibold text-slate-950">
                {formatDurationHours(stage.averageDurationHours)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Basado en {stage.durationSampleSize} registros con duración real.
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-xl font-semibold text-slate-950">Sin dato suficiente</p>
              <p className="mt-1 text-sm text-muted-foreground">
                No hay historial cerrado de esta etapa para calcular promedio.
              </p>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Objeciones frecuentes
          </p>
          <div className="mt-3 space-y-2">
            {stage.topObjections.length > 0 ? (
              stage.topObjections.map((objection) => (
                <div key={objection.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-700">{formatObjectionLabel(objection)}</span>
                  <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-950">
                    {objection.count}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay objeciones detectadas para leads en esta etapa.
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

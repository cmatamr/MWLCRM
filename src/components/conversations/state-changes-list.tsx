import { InlineStateDisplay } from "@/components/ui/state-display";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/formatters";
import type { ConversationStateChangeItem } from "@/server/services/conversations";

import {
  formatDurationSeconds,
  formatStageValueLabel,
} from "./conversation-presenters";

type StateChangesListProps = {
  stateChanges: ConversationStateChangeItem[];
};

export function StateChangesList({ stateChanges }: StateChangesListProps) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)]">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
          State changes
        </p>
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Cambios de estado
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Historial real de etapa para entender avance, retrocesos y tiempos de permanencia.
          </p>
        </div>
      </div>

      <div className="mt-6 min-h-0 flex-1 space-y-3 overflow-y-auto">
        {stateChanges.length > 0 ? (
          stateChanges.map((change) => (
            <article
              key={change.id}
              className="rounded-[24px] border border-border/70 bg-slate-50/80 p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <StatusBadge tone="info">
                    {formatStageValueLabel(change.stage)}
                  </StatusBadge>
                  <p className="text-sm leading-6 text-slate-700">
                    {change.reason?.trim() || "Sin motivo documentado para este cambio."}
                  </p>
                </div>

                <div className="space-y-1 text-sm text-muted-foreground md:text-right">
                  <p>Entró: {formatDateTime(change.enteredAt)}</p>
                  <p>Salió: {change.exitedAt ? formatDateTime(change.exitedAt) : "Etapa actual"}</p>
                  <p>Duración: {formatDurationSeconds(change.durationSeconds)}</p>
                </div>
              </div>
            </article>
          ))
        ) : (
          <InlineStateDisplay
            title="No hay cambios de estado registrados"
            description="Cuando una conversación cambie de etapa, aquí quedará trazabilidad del recorrido."
            className="flex h-full items-center justify-center border-dashed border-border bg-slate-50/70 text-center shadow-none [&_h3]:text-lg [&_h3]:leading-tight md:[&_h3]:text-xl [&_p]:text-xs [&_p]:leading-5 md:[&_p]:text-sm md:[&_p]:leading-6 [&_svg]:h-5 [&_svg]:w-5 [&>div]:w-full [&>div>div:first-child]:h-11 [&>div>div:first-child]:w-11 [&>div>div:first-child]:rounded-xl"
          />
        )}
      </div>
    </section>
  );
}

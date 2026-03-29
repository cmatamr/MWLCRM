import type { FunnelSummary } from "@/server/services/funnel/types";
import { TableEmptyStateRow } from "@/components/ui/state-display";
import { formatDateTime } from "@/lib/formatters";

import { formatDurationHours, formatStageLabel } from "./funnel-presenters";

type StalledConversationsTableProps = {
  items: FunnelSummary["stalledConversations"];
  comparableCount: number;
};

export function StalledConversationsTable({
  items,
  comparableCount,
}: StalledConversationsTableProps) {
  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
          Alertas
        </p>
        <div className="space-y-1">
          <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
            Conversaciones estancadas
          </h3>
          <p className="text-sm leading-6 text-muted-foreground">
            Se consideran estancadas cuando su tiempo en etapa supera el promedio histórico real de
            esa misma etapa.
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-[24px] border border-border/70">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border/70 text-left">
            <caption className="sr-only">
              Conversaciones cuyo tiempo en etapa supera el promedio histórico comparable.
            </caption>
            <thead className="bg-muted/40 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Conversation</th>
                <th scope="col" className="px-4 py-3 font-medium">Contacto</th>
                <th scope="col" className="px-4 py-3 font-medium">Etapa</th>
                <th scope="col" className="px-4 py-3 font-medium">Tiempo en etapa</th>
                <th scope="col" className="px-4 py-3 font-medium">Promedio etapa</th>
                <th scope="col" className="px-4 py-3 font-medium">Última actividad</th>
                <th scope="col" className="px-4 py-3 font-medium">Objeciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-white">
              {items.length > 0 ? (
                items.map((item) => (
                  <tr key={item.id} className="text-sm text-slate-700">
                    <td className="px-4 py-4 font-medium text-slate-950">{item.leadThreadKey}</td>
                    <td className="px-4 py-4">{item.contactName ?? "Sin nombre"}</td>
                    <td className="px-4 py-4">{formatStageLabel(item.stage)}</td>
                    <td className="px-4 py-4 font-medium text-slate-950">
                      {formatDurationHours(item.currentStageAgeHours)}
                    </td>
                    <td className="px-4 py-4">{formatDurationHours(item.averageStageDurationHours)}</td>
                    <td className="px-4 py-4">{formatDateTime(item.lastActivityAt)}</td>
                    <td className="px-4 py-4">{item.objectionCount}</td>
                  </tr>
                ))
              ) : (
                <TableEmptyStateRow
                  colSpan={7}
                  title="No hay conversaciones estancadas"
                  description={
                    comparableCount > 0
                      ? "Las conversaciones comparables están dentro de rangos normales para su etapa."
                      : "Todavía no hay suficiente historial para estimar estancamientos con confianza."
                  }
                />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

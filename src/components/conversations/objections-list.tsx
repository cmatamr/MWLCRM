import { InlineStateDisplay } from "@/components/ui/state-display";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/formatters";
import type { ConversationObjectionItem } from "@/server/services/conversations";

import { formatObjectionLabel } from "./conversation-presenters";

type ObjectionsListProps = {
  objections: ConversationObjectionItem[];
};

export function ObjectionsList({ objections }: ObjectionsListProps) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)]">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
          Objections
        </p>
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Objeciones detectadas
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Señales comerciales detectadas para priorizar intervención humana y próximos pasos.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {objections.length > 0 ? (
          objections.map((objection) => (
            <article
              key={objection.id}
              className="rounded-[24px] border border-border/70 bg-slate-50/80 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone="warning" className="text-accent">
                      {formatObjectionLabel(objection.objectionType, objection.objectionSubtype)}
                    </StatusBadge>
                    <StatusBadge tone={objection.resolvedAt ? "success" : "neutral"}>
                      {objection.resolvedAt ? "Resuelta" : "Abierta"}
                    </StatusBadge>
                  </div>
                  <p className="text-sm leading-6 text-slate-700">
                    {objection.messagePreview?.trim() || "Sin preview del mensaje asociado."}
                  </p>
                </div>

                <div className="space-y-1 text-sm text-muted-foreground md:text-right">
                  <p>Detectada: {formatDateTime(objection.createdAt)}</p>
                  <p>Fuente: {objection.detectedFrom ?? "No especificada"}</p>
                  <p>
                    Confianza:{" "}
                    {objection.confidence != null ? `${Math.round(objection.confidence * 100)}%` : "N/D"}
                  </p>
                  <p>
                    Resuelta:{" "}
                    {objection.resolvedAt ? formatDateTime(objection.resolvedAt) : "Pendiente"}
                  </p>
                </div>
              </div>
            </article>
          ))
        ) : (
          <InlineStateDisplay
            title="No se detectaron objeciones"
            description="Esta conversación no tiene señales comerciales clasificadas como objeciones."
            className="border-dashed border-border bg-slate-50/70 shadow-none"
          />
        )}
      </div>
    </section>
  );
}

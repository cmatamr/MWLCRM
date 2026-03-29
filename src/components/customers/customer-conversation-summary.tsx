import type { CustomerConversationSummary as CustomerConversationSummaryItem } from "@/server/services/customers/types";
import { InlineStateDisplay } from "@/components/ui/state-display";
import { formatDateTime } from "@/lib/formatters";
import { StatusBadge, StatusBadgeFromViewModel } from "@/components/ui/status-badge";

import { getLeadStageBadge } from "./customer-presenters";

type CustomerConversationSummaryProps = {
  conversations: CustomerConversationSummaryItem[];
};

export function CustomerConversationSummary({
  conversations,
}: CustomerConversationSummaryProps) {
  return (
    <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
          Conversations
        </p>
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Actividad conversacional
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Resumen básico del contexto de atención y seguimiento comercial asociado.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {conversations.length > 0 ? (
          conversations.map((conversation) => {
            const leadStageBadge = getLeadStageBadge(conversation.leadStage);

            return (
            <article
              key={conversation.id}
              className="rounded-[24px] border border-border/70 bg-slate-50/70 p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge>
                      {conversation.leadThreadKey}
                    </StatusBadge>
                    <StatusBadgeFromViewModel badge={leadStageBadge} />
                  </div>
                  <p className="text-sm leading-6 text-slate-700">
                    {conversation.lastMessagePreview?.trim() || "Sin preview del último mensaje."}
                  </p>
                </div>

                <div className="space-y-1 text-sm text-muted-foreground md:text-right">
                  <p>{conversation.messageCount} mensajes</p>
                  <p>Actualizado: {formatDateTime(conversation.updatedAt)}</p>
                </div>
              </div>
            </article>
          );
          })
        ) : (
          <InlineStateDisplay
            title="No hay actividad conversacional vinculada"
            description="Cuando este customer tenga conversaciones asociadas, aquí verás el contexto más reciente."
            className="border-dashed border-border bg-slate-50/70 shadow-none"
          />
        )}
      </div>
    </section>
  );
}

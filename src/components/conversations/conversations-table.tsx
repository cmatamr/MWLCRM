import Link from "next/link";

import { StatusBadgeFromViewModel } from "@/components/ui/status-badge";
import { TableEmptyStateRow } from "@/components/ui/state-display";
import { formatDateTime } from "@/lib/formatters";
import type { ConversationListItem } from "@/server/services/conversations";

import {
  formatConversationChannelLabel,
  getLeadStageBadge,
} from "./conversation-presenters";

type ConversationsTableProps = {
  conversations: ConversationListItem[];
  selectedConversationId: string | null;
};

export function ConversationsTable({
  conversations,
  selectedConversationId,
}: ConversationsTableProps) {
  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)]">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
          Supervision
        </p>
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Conversaciones activas
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Lista operativa para revisar hilos abiertos, última interacción y señales comerciales.
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-[24px] border border-border/70">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border/70 text-left">
            <caption className="sr-only">
              Conversaciones activas con canal, etapa del lead, actividad reciente y objeciones detectadas.
            </caption>
            <thead className="bg-muted/40 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">lead_thread_id</th>
                <th scope="col" className="px-4 py-3 font-medium">display_name</th>
                <th scope="col" className="px-4 py-3 font-medium">channel</th>
                <th scope="col" className="px-4 py-3 font-medium">lead_stage</th>
                <th scope="col" className="px-4 py-3 font-medium">ultima interaccion</th>
                <th scope="col" className="px-4 py-3 font-medium">total_messages</th>
                <th scope="col" className="px-4 py-3 font-medium">objections</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-white">
              {conversations.length > 0 ? (
                conversations.map((conversation) => {
                  const isSelected = conversation.id === selectedConversationId;
                  const leadStageBadge = getLeadStageBadge(conversation.leadStage);

                  return (
                    <tr
                      key={conversation.id}
                      className={isSelected ? "bg-primary/5 text-slate-900" : "text-slate-700"}
                    >
                      <td className="px-4 py-4 align-top">
                        <Link
                          href={`/conversations?threadId=${conversation.id}`}
                          className="block space-y-1 rounded-[18px] transition-colors hover:text-primary"
                        >
                          <span className="block break-all text-sm font-medium text-slate-950">
                            {conversation.id}
                          </span>
                          <span className="block text-xs uppercase tracking-[0.12em] text-muted-foreground">
                            Key: {conversation.leadThreadKey}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-slate-950">
                            {conversation.contact.name ?? "Sin nombre"}
                          </p>
                          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                            Owner: {conversation.owner}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-sm">
                        {formatConversationChannelLabel(conversation.channel)}
                      </td>
                      <td className="px-4 py-4 align-top text-sm">
                        <StatusBadgeFromViewModel badge={leadStageBadge} />
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-slate-950">
                            {formatDateTime(conversation.lastInteractionAt)}
                          </p>
                          <p className="max-w-xs text-sm leading-6 text-muted-foreground">
                            {conversation.lastMessagePreview?.trim() || "Sin preview del último mensaje."}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-sm font-medium text-slate-950">
                        {conversation.totalMessages}
                      </td>
                      <td className="px-4 py-4 align-top">
                        {conversation.objections.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {conversation.objections.map((objection) => (
                              <span
                                key={`${conversation.id}-${objection}`}
                                className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-accent"
                              >
                                {objection}
                              </span>
                            ))}
                            {conversation.objectionCount > conversation.objections.length ? (
                              <span className="rounded-full border border-border/80 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
                                +{conversation.objectionCount - conversation.objections.length}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Sin objeciones detectadas</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <TableEmptyStateRow
                  colSpan={7}
                  title="No hay conversaciones para supervisar"
                  description="Cuando entren nuevos threads al CRM, aparecerán aquí con su etapa y señales comerciales."
                />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

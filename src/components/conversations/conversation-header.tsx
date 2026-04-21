import Link from "next/link";

import { StatusBadge, StatusBadgeFromViewModel } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/formatters";
import { getFriendlyFieldLabel } from "@/lib/ui-labels";
import type { ConversationDetail } from "@/server/services/conversations";

import {
  formatConversationChannelLabel,
  getLeadStageBadge,
} from "./conversation-presenters";

type ConversationHeaderProps = {
  conversation: ConversationDetail;
};

export function ConversationHeader({ conversation }: ConversationHeaderProps) {
  const leadStageBadge = getLeadStageBadge(conversation.leadStage);
  const summaryItems = [
    {
      label: "Última interacción",
      value: formatDateTime(conversation.lastInteractionAt),
      hint: "Referencia principal para supervisión",
    },
    {
      label: "Mensajes",
      value: String(conversation.metrics.totalMessages),
      hint: "Volumen total del thread",
    },
    {
      label: "Objeciones abiertas",
      value: String(conversation.metrics.openObjectionCount),
      hint: "Señales pendientes de manejo comercial",
    },
    {
      label: "Cambios de estado",
      value: String(conversation.metrics.stateChangeCount),
      hint: "Trazabilidad histórica de etapa",
    },
  ];

  return (
    <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)]">
      <div className="bg-hero-grid p-6 md:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
                Resumen de conversación
              </p>
              <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-950">
                {conversation.contact.name ?? conversation.leadThreadKey}
              </h1>
              <p className="break-all text-sm text-slate-600">
                ID de conversación: {conversation.id}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge tone="info">
                {formatConversationChannelLabel(conversation.channel)}
              </StatusBadge>
              <StatusBadgeFromViewModel badge={leadStageBadge} />
              <StatusBadge>
                Responsable: {conversation.owner}
              </StatusBadge>
              <StatusBadge>
                Score: {conversation.leadScore}
              </StatusBadge>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {summaryItems.map((item) => (
              <article
                key={item.label}
                className="rounded-[24px] border border-border/70 bg-white/85 px-4 py-3"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-950">{item.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <article className="rounded-[24px] border border-border/70 bg-white/85 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Contacto
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950">
              {conversation.contact.name ?? "Sin nombre registrado"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {getFriendlyFieldLabel("external_id")}: {conversation.contact.externalId ?? "No disponible"}
            </p>
            {conversation.contact.id ? (
              <Link
                href={`/customers/${conversation.contact.id}`}
                className="mt-3 inline-flex text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                Ver cliente
              </Link>
            ) : null}
          </article>

          <article className="rounded-[24px] border border-border/70 bg-white/85 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Señal comercial
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950">
              {conversation.metrics.openObjectionCount > 0
                ? "Requiere seguimiento comercial"
                : "Sin fricciones detectadas"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {conversation.lastMessagePreview?.trim() || "Aún no hay preview del último mensaje."}
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Modo: {conversation.mode}
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

import { InlineStateDisplay } from "@/components/ui/state-display";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/formatters";
import type { ConversationMessage } from "@/server/services/conversations";

import { formatSenderLabel } from "./conversation-presenters";

type MessageListProps = {
  messages: ConversationMessage[];
};

export function MessageList({ messages }: MessageListProps) {
  return (
    <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
          Messages
        </p>
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Mensajes recientes
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Historial reciente del thread para revisar contexto sin entrar a un chat en tiempo real.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {messages.length > 0 ? (
          messages.map((message) => (
            <article
              key={message.id}
              className="rounded-[24px] border border-border/70 bg-slate-50/80 p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone="info">
                      {formatSenderLabel(message.senderType)}
                    </StatusBadge>
                    <StatusBadge>
                      Provider: {message.provider}
                    </StatusBadge>
                    {message.attachmentCount > 0 ? (
                      <StatusBadge>
                        Adjuntos: {message.attachmentCount}
                      </StatusBadge>
                    ) : null}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {message.text?.trim() || "Mensaje sin contenido de texto."}
                  </p>
                </div>

                <div className="space-y-1 text-sm text-muted-foreground md:min-w-48 md:text-right">
                  <p>Creado: {formatDateTime(message.createdAt)}</p>
                  <p>Recibido: {formatDateTime(message.receivedAt)}</p>
                </div>
              </div>
            </article>
          ))
        ) : (
          <InlineStateDisplay
            title="No hay mensajes disponibles"
            description="Todavía no se cargaron mensajes recientes para esta conversación."
            className="border-dashed border-border bg-slate-50/70 shadow-none"
          />
        )}
      </div>
    </section>
  );
}

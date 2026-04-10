import { InlineStateDisplay } from "@/components/ui/state-display";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { ConversationMessage } from "@/server/services/conversations";

import { formatSenderLabel } from "./conversation-presenters";

type MessageListProps = {
  messages: ConversationMessage[];
};

export function MessageList({ messages }: MessageListProps) {
  const chatMessages = [...messages].reverse();

  return (
    <section className="flex min-h-0 flex-col rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)] xl:h-[var(--conversation-detail-height)]">
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

      <div className="mt-6 flex min-h-0 flex-1 flex-col">
        {chatMessages.length > 0 ? (
          <div className="flex min-h-0 flex-1 flex-col-reverse gap-3 overflow-y-auto pr-1">
            {chatMessages.map((message) => {
              const isCustomerMessage = message.senderType === "customer";

              return (
                <article
                  key={message.id}
                  className={cn("flex", isCustomerMessage ? "justify-start" : "justify-end")}
                >
                  <div
                    className={cn(
                      "w-full max-w-[84%] rounded-[20px] border p-3 shadow-[0_16px_30px_-18px_rgba(2,6,23,0.28),0_8px_18px_-12px_rgba(2,6,23,0.2)]",
                      isCustomerMessage
                        ? "border-border/70 bg-slate-100/90"
                        : "border-[#2b4f7a]/35 bg-[linear-gradient(180deg,rgba(22,80,133,0.14),rgba(12,45,87,0.08))]",
                    )}
                  >
                    <div
                      className={cn(
                        "flex flex-wrap gap-2",
                        isCustomerMessage ? "justify-start" : "justify-end",
                      )}
                    >
                      <StatusBadge tone={isCustomerMessage ? "info" : "neutral"}>
                        {formatSenderLabel(message.senderType)}
                      </StatusBadge>
                      {message.attachmentCount > 0 ? (
                        <StatusBadge>
                          Adjuntos: {message.attachmentCount}
                        </StatusBadge>
                      ) : null}
                    </div>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {message.text?.trim() || "Mensaje sin contenido de texto."}
                    </p>

                    <div
                      className={cn(
                        "mt-2 space-y-0.5 text-xs text-muted-foreground",
                        isCustomerMessage ? "text-left" : "text-right",
                      )}
                    >
                      <p>Provider: {message.provider}</p>
                      <p>Recibido: {formatDateTime(message.receivedAt)}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 items-center">
            <InlineStateDisplay
              title="No hay mensajes disponibles"
              description="Todavía no se cargaron mensajes recientes para esta conversación."
              className="w-full border-dashed border-border bg-slate-50/70 shadow-none"
            />
          </div>
        )}
      </div>
    </section>
  );
}

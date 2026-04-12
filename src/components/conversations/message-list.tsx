import { Bot, UserRound } from "lucide-react";

import { InlineStateDisplay } from "@/components/ui/state-display";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { ConversationMessage } from "@/server/services/conversations";

import { formatSenderLabel } from "./conversation-presenters";

type MessageListProps = {
  messages: ConversationMessage[];
  customerName?: string | null;
};

export function MessageList({ messages, customerName }: MessageListProps) {
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
              const isAgentMessage = message.senderType === "agent";
              const isSystemMessage = message.senderType === "system";
              const senderLabel = isCustomerMessage
                ? (customerName?.trim() || "CLIENTE")
                : isAgentMessage
                  ? "NOVA"
                  : isSystemMessage
                    ? "SYSTEM"
                    : formatSenderLabel(message.senderType);
              const providerLabel = isSystemMessage ? "CRM" : message.provider;

              return (
                <article
                  key={message.id}
                  className={cn(
                    "flex",
                    isCustomerMessage
                      ? "justify-start"
                      : isSystemMessage
                        ? "justify-center"
                        : "justify-end",
                  )}
                >
                  <div
                    className={cn(
                      "w-full rounded-[20px] border p-3 shadow-[0_16px_30px_-18px_rgba(2,6,23,0.28),0_8px_18px_-12px_rgba(2,6,23,0.2)] transition-transform duration-300 will-change-transform",
                      isSystemMessage ? "max-w-[62%]" : "max-w-[84%]",
                      isCustomerMessage
                        ? "border-border/70 bg-slate-100/90"
                        : isSystemMessage
                          ? "border-emerald-300/70 bg-[linear-gradient(180deg,rgba(167,243,208,0.35),rgba(220,252,231,0.45))] transform-gpu hover:[transform:perspective(1000px)_rotateX(4deg)_translateY(-6px)_scale(1.01)] hover:shadow-[0_26px_44px_-20px_rgba(16,185,129,0.35),0_12px_26px_-16px_rgba(2,6,23,0.24)]"
                          : "border-[#2b4f7a]/35 bg-[linear-gradient(180deg,rgba(22,80,133,0.14),rgba(12,45,87,0.08))]",
                    )}
                  >
                    <div
                      className={cn(
                        "flex flex-wrap gap-2",
                        isCustomerMessage
                          ? "justify-start"
                          : isSystemMessage
                            ? "justify-center"
                            : "justify-end",
                      )}
                    >
                      <StatusBadge tone={isCustomerMessage ? "info" : isSystemMessage ? "success" : "neutral"}>
                        <span className="inline-flex items-center gap-1.5">
                          {isCustomerMessage ? (
                            <UserRound className="h-3 w-3" />
                          ) : isAgentMessage ? (
                            <Bot className="h-3 w-3" />
                          ) : null}
                          {senderLabel}
                        </span>
                      </StatusBadge>
                      {message.attachmentCount > 0 ? (
                        <StatusBadge>
                          Adjuntos: {message.attachmentCount}
                        </StatusBadge>
                      ) : null}
                    </div>

                    <p
                      className={cn(
                        "mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700",
                        isSystemMessage ? "text-center" : "",
                      )}
                    >
                      {message.text?.trim() || "Mensaje sin contenido de texto."}
                    </p>

                    <div
                      className={cn(
                        "mt-2 space-y-0.5 text-xs text-muted-foreground",
                        isCustomerMessage
                          ? "text-left"
                          : isSystemMessage
                            ? "text-center"
                            : "text-right",
                      )}
                    >
                      <p>Provider: {providerLabel}</p>
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

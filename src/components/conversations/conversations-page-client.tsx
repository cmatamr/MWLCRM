"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

import { ConversationHeader } from "@/components/conversations/conversation-header";
import { ConversationsTable } from "@/components/conversations/conversations-table";
import { MessageList } from "@/components/conversations/message-list";
import { ObjectionsList } from "@/components/conversations/objections-list";
import { StateChangesList } from "@/components/conversations/state-changes-list";
import { PageHeader } from "@/components/layout/page-header";
import { PageLoading } from "@/components/ui/page-loading";
import { StateDisplay } from "@/components/ui/state-display";
import { useConversations } from "@/hooks/use-conversations";
import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys, queryRefetchIntervals } from "@/lib/query-config";
import { formatDateTime } from "@/lib/formatters";
import type { ConversationDetail } from "@/server/services/conversations";

function buildSummaryCards(
  conversations: Awaited<ReturnType<typeof crmApiClient.listConversations>>["items"],
) {
  const conversationsWithObjections = conversations.filter(
    (conversation) => conversation.objectionCount > 0,
  ).length;
  const conversationsWithoutContactName = conversations.filter(
    (conversation) => !conversation.contact.name,
  ).length;
  const mostRecentInteraction = conversations[0]?.lastInteractionAt ?? null;

  return [
    {
      label: "Threads visibles",
      value: String(conversations.length),
      hint: "Conversaciones cargadas en esta vista",
    },
    {
      label: "Con objeciones",
      value: String(conversationsWithObjections),
      hint: "Threads con senales comerciales detectadas",
    },
    {
      label: "Sin nombre",
      value: String(conversationsWithoutContactName),
      hint: "Contactos por enriquecer para seguimiento",
    },
    {
      label: "Ultimo touchpoint",
      value: mostRecentInteraction ? formatDateTime(mostRecentInteraction) : "Sin actividad",
      hint: "Ultima interaccion cargada en la tabla",
    },
  ];
}

export function ConversationsPageClient() {
  const searchParams = useSearchParams();
  const selectedConversationId = searchParams.get("threadId");
  const { data, isLoading, isError, error } = useConversations({
    pageSize: 20,
  });

  const fallbackConversationId = data?.items[0]?.id ?? null;
  const resolvedConversationId = selectedConversationId ?? fallbackConversationId;

  const conversationDetailQuery = useQuery<ConversationDetail, FetcherError>({
    queryKey: queryKeys.conversationDetail(resolvedConversationId),
    queryFn: () => crmApiClient.getConversation(resolvedConversationId as string),
    enabled: Boolean(resolvedConversationId),
    refetchInterval: queryRefetchIntervals.conversations,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  if (isLoading && !data) {
    return <PageLoading summaryCards={4} detailSidebar tables={1} />;
  }

  if (isError || !data) {
    return (
      <StateDisplay
        tone="error"
        title="No pudimos cargar las conversaciones"
        description={error?.message ?? "Ocurrio un error controlado al consultar este modulo."}
      />
    );
  }

  const selectedConversation = conversationDetailQuery.data;
  const summaryCards = buildSummaryCards(data.items);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <PageHeader
          title="Conversations"
          description="Modulo de supervision comercial para revisar conversaciones activas, ultimos mensajes, objeciones detectadas y evolucion de etapa sin depender de un chat en tiempo real."
        />
        <div className="rounded-2xl border border-border/70 bg-white/80 px-4 py-3 text-sm text-muted-foreground">
          {data.pagination.total} conversaciones registradas
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => (
          <article
            key={item.label}
            className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-[0_34px_62px_-30px_rgba(2,6,23,0.24),0_14px_30px_-16px_rgba(2,6,23,0.17)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{item.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.hint}</p>
          </article>
        ))}
      </section>

      <ConversationsTable
        conversations={data.items}
        selectedConversationId={selectedConversation?.id ?? resolvedConversationId}
      />

      {conversationDetailQuery.isError ? (
        <StateDisplay
          eyebrow="Conversations"
          tone="error"
          title="No pudimos actualizar el detalle de la conversacion"
          description={
            conversationDetailQuery.error?.message ??
            "Ocurrio un error controlado al cargar el detalle seleccionado."
          }
          className="shadow-none"
        />
      ) : conversationDetailQuery.isLoading && !selectedConversation ? (
        <PageLoading detailSidebar tables={1} />
      ) : selectedConversation ? (
        <>
          <ConversationHeader conversation={selectedConversation} />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)] xl:[--conversation-detail-height:760px]">
            <MessageList
              messages={selectedConversation.messages}
              customerName={selectedConversation.contact.name}
            />
            <div className="flex min-h-0 flex-col gap-6 xl:h-[var(--conversation-detail-height)]">
              <div className="min-h-0 flex-1">
                <ObjectionsList objections={selectedConversation.objections} />
              </div>
              <div className="min-h-0 flex-1">
                <StateChangesList stateChanges={selectedConversation.stateChanges} />
              </div>
            </div>
          </div>
        </>
      ) : (
        <StateDisplay
          eyebrow="Conversations"
          title="No hay datos disponibles"
          description="Selecciona un thread cuando exista o espera a que el CRM sincronice conversaciones activas."
          className="shadow-none"
        />
      )}
    </div>
  );
}

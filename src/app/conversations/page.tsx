import { conversationSelectionParamsSchema, safeParseQueryParams } from "@/domain/crm";
import { ConversationHeader } from "@/components/conversations/conversation-header";
import { ConversationsTable } from "@/components/conversations/conversations-table";
import { MessageList } from "@/components/conversations/message-list";
import { ObjectionsList } from "@/components/conversations/objections-list";
import { StateChangesList } from "@/components/conversations/state-changes-list";
import { PageHeader } from "@/components/layout/page-header";
import { StateDisplay } from "@/components/ui/state-display";
import { formatDateTime } from "@/lib/formatters";
import { getConversationDetail, listConversations } from "@/server/services/conversations";

export const dynamic = "force-dynamic";

type ConversationsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function buildSummaryCards(
  conversations: Awaited<ReturnType<typeof listConversations>>["items"],
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
      hint: "Threads con señales comerciales detectadas",
    },
    {
      label: "Sin nombre",
      value: String(conversationsWithoutContactName),
      hint: "Contactos por enriquecer para seguimiento",
    },
    {
      label: "Último touchpoint",
      value: mostRecentInteraction ? formatDateTime(mostRecentInteraction) : "Sin actividad",
      hint: "Última interacción cargada en la tabla",
    },
  ];
}

export default async function ConversationsPage({ searchParams }: ConversationsPageProps) {
  const [{ items, pagination }, resolvedSearchParams] = await Promise.all([
    listConversations({
      pageSize: 20,
    }),
    searchParams ?? Promise.resolve({}),
  ]);
  const parsedSelection = safeParseQueryParams(
    conversationSelectionParamsSchema,
    resolvedSearchParams,
  );
  const selectedConversationId = parsedSelection.success
    ? parsedSelection.data.threadId ?? items[0]?.id ?? null
    : items[0]?.id ?? null;
  const selectedConversation = selectedConversationId
    ? await getConversationDetail(selectedConversationId)
    : null;
  const summaryCards = buildSummaryCards(items);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <PageHeader
          title="Conversations"
          description="Módulo de supervisión comercial para revisar conversaciones activas, últimos mensajes, objeciones detectadas y evolución de etapa sin depender de un chat en tiempo real."
        />
        <div className="rounded-2xl border border-border/70 bg-white/80 px-4 py-3 text-sm text-muted-foreground">
          {pagination.total} conversaciones registradas
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => (
          <article
            key={item.label}
            className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)]"
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
        conversations={items}
        selectedConversationId={selectedConversation?.id ?? selectedConversationId}
      />

      {selectedConversation ? (
        <>
          <ConversationHeader conversation={selectedConversation} />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
            <MessageList messages={selectedConversation.messages} />
            <div className="space-y-6">
              <ObjectionsList objections={selectedConversation.objections} />
              <StateChangesList stateChanges={selectedConversation.stateChanges} />
            </div>
          </div>
        </>
      ) : (
        <StateDisplay
          eyebrow="Conversations"
          title="No hay una conversación disponible para mostrar"
          description="Selecciona un thread cuando exista o espera a que el CRM sincronice conversaciones activas."
          className="shadow-none"
        />
      )}
    </div>
  );
}

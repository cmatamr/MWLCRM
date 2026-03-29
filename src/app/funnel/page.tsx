import { FunnelEmptyState } from "@/components/funnel/funnel-empty-state";
import { FunnelOverview } from "@/components/funnel/funnel-overview";
import { FunnelStageCard } from "@/components/funnel/funnel-stage-card";
import { ObjectionsSummaryCard } from "@/components/funnel/objections-summary-card";
import { StalledConversationsTable } from "@/components/funnel/stalled-conversations-table";
import { PageHeader } from "@/components/layout/page-header";
import { formatDateTime } from "@/lib/formatters";
import { getFunnelSummary } from "@/server/services/funnel";

export const dynamic = "force-dynamic";

export default async function FunnelPage() {
  const summary = await getFunnelSummary();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <PageHeader
          title="Funnel"
          description="Seguimiento del avance comercial por etapa, tiempos reales de permanencia, objeciones detectadas y conversaciones que superan el promedio histórico de su etapa."
        />
        <div className="rounded-2xl border border-border/70 bg-white/80 px-4 py-3 text-sm text-muted-foreground">
          Actualizado: {formatDateTime(summary.generatedAt)}
        </div>
      </div>

      {summary.hasData ? (
        <>
          <FunnelOverview summary={summary} />

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2">
              {summary.stages.map((stage) => (
                <FunnelStageCard key={stage.stage} stage={stage} />
              ))}
            </div>

            <ObjectionsSummaryCard summary={summary} />
          </section>

          <StalledConversationsTable
            items={summary.stalledConversations}
            comparableCount={summary.stalledComparableCount}
          />
        </>
      ) : (
        <FunnelEmptyState />
      )}
    </div>
  );
}

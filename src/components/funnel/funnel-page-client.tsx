"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { FunnelEmptyState } from "@/components/funnel/funnel-empty-state";
import { FunnelOverview } from "@/components/funnel/funnel-overview";
import { FunnelStageCard } from "@/components/funnel/funnel-stage-card";
import { ObjectionsSummaryCard } from "@/components/funnel/objections-summary-card";
import { StalledConversationsTable } from "@/components/funnel/stalled-conversations-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/page-loading";
import { StateDisplay } from "@/components/ui/state-display";
import { useFunnelSummary } from "@/hooks/use-funnel-summary";
import { formatDateTime } from "@/lib/formatters";

export function FunnelPageClient() {
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("campaign_id")?.trim() || undefined;
  const { data, isLoading, isError, error } = useFunnelSummary({ campaignId });

  if (isLoading && !data) {
    return <PageLoading summaryCards={4} tables={2} />;
  }

  if (isError || !data) {
    return (
      <StateDisplay
        tone="error"
        title="No pudimos cargar el funnel"
        description={error?.message ?? "Ocurrio un error controlado al consultar este modulo."}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <PageHeader
          title="Funnel"
          description="Seguimiento del avance comercial por etapa, tiempos reales de permanencia, objeciones detectadas y conversaciones que superan el promedio historico de su etapa."
        />
        <div className="flex flex-wrap items-center gap-3">
          {campaignId ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-slate-700">
              Filtrado por campaña
            </div>
          ) : null}
          <div className="rounded-2xl border border-border/70 bg-white/80 px-4 py-3 text-sm text-muted-foreground">
            Actualizado: {formatDateTime(data.generatedAt)}
          </div>
          {campaignId ? (
            <Button asChild variant="outline">
              <Link href="/funnel">Limpiar filtro</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {data.hasData ? (
        <>
          <FunnelOverview summary={data} />

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2">
              {data.stages.map((stage) => (
                <FunnelStageCard key={stage.stage} stage={stage} />
              ))}
            </div>

            <ObjectionsSummaryCard summary={data} />
          </section>

          <StalledConversationsTable
            items={data.stalledConversations}
            comparableCount={data.stalledComparableCount}
          />
        </>
      ) : (
        <FunnelEmptyState />
      )}
    </div>
  );
}

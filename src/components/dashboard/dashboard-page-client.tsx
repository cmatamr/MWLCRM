"use client";

import { CampaignOverviewCard } from "@/components/dashboard/campaign-overview-card";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { DashboardLoading } from "@/components/dashboard/dashboard-loading";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { DashboardWidgetPlaceholder } from "@/components/dashboard/dashboard-widget-placeholder";
import { FunnelOverviewCard } from "@/components/dashboard/funnel-overview-card";
import { RecentOrdersTable } from "@/components/dashboard/recent-orders-table";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { formatLastUpdated } from "@/components/dashboard/dashboard-helpers";
import { PageHeader } from "@/components/layout/page-header";
import { StateDisplay } from "@/components/ui/state-display";
import { useDashboardSummary } from "@/hooks/use-dashboard-summary";

export function DashboardPageClient() {
  const { data, isLoading, isError, error } = useDashboardSummary();

  if (isLoading && !data) {
    return <DashboardLoading />;
  }

  if (isError || !data) {
    return (
      <StateDisplay
        tone="error"
        title="No pudimos actualizar el dashboard"
        description={error?.message ?? "Ocurrió un error controlado al cargar este módulo."}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <PageHeader
          title="Dashboard"
          description="Vista ejecutiva del CRM con revenue, órdenes recientes, campañas activas y salud del funnel comercial."
        />
        <div className="rounded-2xl border border-border/70 bg-white/80 px-4 py-3 text-sm text-muted-foreground">
          Actualizado: {formatLastUpdated(data.generatedAt)}
        </div>
      </div>

      {data.hasData ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {data.metrics.map((metric) => (
              <DashboardStatCard key={metric.key} metric={metric} />
            ))}
          </section>

          <FunnelOverviewCard overview={data.funnelOverview} />

          <section className="grid gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <CampaignOverviewCard overview={data.campaignOverview} />
            </div>

            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1">
              <DashboardWidgetPlaceholder
                title="Espacio para widget"
                description="Contenedor reservado para un próximo resumen del dashboard."
              />
              <DashboardWidgetPlaceholder
                title="Espacio para widget"
                description="Área preparada para incorporar otro módulo sin alterar la grilla principal."
              />
            </div>
          </section>

          <section>
            <RevenueChart
              title="Ventas diarias"
              description="Ingreso diario de los últimos 14 días usando únicamente órdenes cerradas o listas para entrega."
              data={data.revenueSeries}
            />
          </section>

          <RecentOrdersTable orders={data.recentOrders} />
        </>
      ) : (
        <DashboardEmptyState />
      )}
    </div>
  );
}

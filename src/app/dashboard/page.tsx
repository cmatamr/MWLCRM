import { CampaignOverviewCard } from "@/components/dashboard/campaign-overview-card";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { FunnelOverviewCard } from "@/components/dashboard/funnel-overview-card";
import { RecentOrdersTable } from "@/components/dashboard/recent-orders-table";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { formatLastUpdated } from "@/components/dashboard/dashboard-helpers";
import { PageHeader } from "@/components/layout/page-header";
import { getDashboardSummary } from "@/server/services/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <PageHeader
          title="Dashboard"
          description="Vista ejecutiva del CRM con revenue, órdenes recientes, campañas activas y salud del funnel comercial."
        />
        <div className="rounded-2xl border border-border/70 bg-white/80 px-4 py-3 text-sm text-muted-foreground">
          Actualizado: {formatLastUpdated(summary.generatedAt)}
        </div>
      </div>

      {summary.hasData ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summary.metrics.map((metric) => (
              <DashboardStatCard key={metric.key} metric={metric} />
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
            <RevenueChart
              title="Ventas diarias"
              description="Ingreso diario de los últimos 14 días usando únicamente órdenes cerradas o listas para entrega."
              data={summary.revenueSeries}
            />

            <div className="space-y-6">
              <CampaignOverviewCard overview={summary.campaignOverview} />
              <FunnelOverviewCard overview={summary.funnelOverview} />
            </div>
          </section>

          <RecentOrdersTable orders={summary.recentOrders} />
        </>
      ) : (
        <DashboardEmptyState />
      )}
    </div>
  );
}

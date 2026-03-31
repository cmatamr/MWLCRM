"use client";

import { useState } from "react";
import { OrderStatusEnum } from "@prisma/client";

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
import { useDashboardSummaryWithStatus } from "@/hooks/use-dashboard-summary";
import {
  DEFAULT_DASHBOARD_DAILY_SALES_DAYS,
  type DashboardDailySalesRangeDays,
} from "@/server/services/dashboard/types";

const DAILY_SALES_RANGE_OPTIONS: Array<{
  label: string;
  days: DashboardDailySalesRangeDays;
}> = [
  { label: "Última semana", days: 7 },
  { label: "Últimos 15 días", days: 15 },
  { label: "Último mes", days: 30 },
];

function getRevenueDescription(days: number) {
  return `Ingreso diario de los últimos ${days} días usando únicamente órdenes cerradas o listas para entrega.`;
}

export function DashboardPageClient() {
  const [selectedDays, setSelectedDays] = useState<DashboardDailySalesRangeDays>(
    DEFAULT_DASHBOARD_DAILY_SALES_DAYS,
  );
  const [statusFilter, setStatusFilter] = useState<OrderStatusEnum | undefined>(undefined);
  const { data, isLoading, isFetching, isError, error } = useDashboardSummaryWithStatus(
    selectedDays,
    statusFilter,
  );

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
              description={getRevenueDescription(data.revenueWindowDays)}
              selectedDays={selectedDays}
              windowDays={data.revenueWindowDays}
              rangeOptions={DAILY_SALES_RANGE_OPTIONS}
              onRangeChange={setSelectedDays}
              isRefreshing={isFetching}
              data={data.revenueSeries}
            />
          </section>

          <RecentOrdersTable
            orders={data.recentOrders}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            isApplyingFilter={isFetching}
          />
        </>
      ) : (
        <DashboardEmptyState />
      )}
    </div>
  );
}

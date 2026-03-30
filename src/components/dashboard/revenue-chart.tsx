import type {
  DashboardDailyRevenuePoint,
  DashboardDailySalesRangeDays,
} from "@/server/services/dashboard/types";
import { formatCurrencyCRC } from "@/lib/formatters";

import {
  getAverageDailyRevenue,
  getRevenueChartBounds,
  getRevenueChartPath,
} from "./dashboard-helpers";

type RevenueRangeOption = {
  label: string;
  days: DashboardDailySalesRangeDays;
};

type RevenueChartProps = {
  title: string;
  description: string;
  selectedDays: DashboardDailySalesRangeDays;
  windowDays: number;
  rangeOptions: RevenueRangeOption[];
  onRangeChange: (days: DashboardDailySalesRangeDays) => void;
  isRefreshing?: boolean;
  data: DashboardDailyRevenuePoint[];
};

export function RevenueChart({
  title,
  description,
  selectedDays,
  windowDays,
  rangeOptions,
  onRangeChange,
  isRefreshing = false,
  data,
}: RevenueChartProps) {
  const { safeMax, totalRevenue, totalOrders } = getRevenueChartBounds(data);
  const { line, area } = getRevenueChartPath(data, safeMax);
  const averageDailyRevenue = getAverageDailyRevenue(data, windowDays);
  const reading =
    totalRevenue > 0
      ? "La curva muestra cuánto negocio se está convirtiendo a ingreso día a día."
      : "Todavía no hay ventas cerradas en esta ventana para dibujar tendencia.";

  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
              Revenue
            </p>
            <div className="space-y-1">
              <h3 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h3>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
          </div>

          <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-muted/40 p-1">
            {rangeOptions.map((option) => {
              const isActive = option.days === selectedDays;

              return (
                <button
                  key={option.days}
                  type="button"
                  onClick={() => onRangeChange(option.days)}
                  disabled={isRefreshing && isActive}
                  className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-slate-950"
                  } ${isRefreshing && isActive ? "cursor-wait opacity-80" : ""}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_140px]">
          <div className="space-y-3 rounded-[28px] bg-[linear-gradient(180deg,rgba(14,116,144,0.10),rgba(255,255,255,0.7))] p-4">
            <div className="h-72">
              <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="revenueArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {[25, 50, 75].map((linePosition) => (
                  <line
                    key={linePosition}
                    x1="0"
                    x2="100"
                    y1={linePosition}
                    y2={linePosition}
                    stroke="rgba(100,116,139,0.18)"
                    strokeDasharray="1.5 2.5"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}

                {area ? (
                  <polygon fill="url(#revenueArea)" points={area} />
                ) : null}
                {line ? (
                  <polyline
                    fill="none"
                    points={line}
                    stroke="hsl(var(--chart-1))"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                ) : null}
              </svg>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground md:grid-cols-7 lg:grid-cols-5 xl:grid-cols-7">
              {data.map((point) => (
                <div key={point.date} className="space-y-1">
                  <p className="font-medium text-slate-700">{point.label}</p>
                  <p>{formatCurrencyCRC(point.revenueCrc)}</p>
                </div>
              ))}
            </div>

            <p className="text-sm leading-6 text-slate-700">{reading}</p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-2xl bg-slate-950 px-4 py-4 text-white">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Revenue</p>
              <p className="mt-2 text-xl font-semibold">{formatCurrencyCRC(totalRevenue)}</p>
            </div>
            <div className="rounded-2xl bg-secondary px-4 py-4 text-secondary-foreground">
              <p className="text-xs uppercase tracking-[0.18em]">Orders</p>
              <p className="mt-2 text-xl font-semibold">{totalOrders.toLocaleString("es-CR")}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Promedio diario
              </p>
              <p className="mt-2 text-xl font-semibold text-slate-950">
                {formatCurrencyCRC(averageDailyRevenue)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

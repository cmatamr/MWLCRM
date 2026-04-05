import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  DashboardDailyRevenuePoint,
  DashboardDailySalesRangeDays,
} from "@/server/services/dashboard/types";
import { formatCurrencyCRC } from "@/lib/formatters";

import {
  getAverageDailyRevenue,
  getRevenueChartBounds,
  getRevenueChartPresentation,
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
  const router = useRouter();
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [activeSegmentKey, setActiveSegmentKey] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<{
    x: number;
    y: number;
    orderIdLabel: string;
    amountCrc: number;
    dayLabel: string;
  } | null>(null);

  const presentation = getRevenueChartPresentation(data, selectedDays);
  const visualData = presentation.series;
  const { safeMax } = getRevenueChartBounds(visualData);
  const { totalRevenue, totalOrders } = getRevenueChartBounds(data);
  const averageDailyRevenue = getAverageDailyRevenue(data, windowDays);
  const reading =
    totalRevenue > 0
      ? "La curva muestra cuánto negocio se está convirtiendo a ingreso día a día."
      : "Todavía no hay ventas cerradas en esta ventana para dibujar tendencia.";

  const stackedBars = useMemo(() => {
    if (visualData.length === 0) {
      return [];
    }

    const chartWidth = 100;
    const chartBottom = 94;
    const chartUsableHeight = 90;
    const slotWidth = chartWidth / visualData.length;
    const barWidth = Math.max(1.8, slotWidth * presentation.barWidthRatio);

    return visualData.map((point, index) => {
      const x = index * slotWidth + (slotWidth - barWidth) / 2;
      const total = point.revenueCrc;
      const barHeight = total > 0 ? (total / safeMax) * chartUsableHeight : 0;
      const barTop = chartBottom - barHeight;

      if (total <= 0 || point.orderBreakdown.length === 0) {
        return {
          point,
          segments: [] as Array<{ x: number; y: number; width: number; height: number; orderId: string; amountCrc: number }>,
        };
      }

      let currentBottom = chartBottom;
      const segments = point.orderBreakdown.map((order, orderIndex, orders) => {
        const isLast = orderIndex === orders.length - 1;
        const proportionalHeight = barHeight * (order.amountCrc / total);
        const nextHeight = isLast
          ? Math.max(0.7, currentBottom - barTop)
          : Math.max(0.7, proportionalHeight);
        const y = currentBottom - nextHeight;

        currentBottom = y;

        return {
          x,
          y,
          width: barWidth,
          height: nextHeight,
          orderId: order.orderId,
          amountCrc: order.amountCrc,
        };
      });

      return {
        point,
        segments,
      };
    });
  }, [presentation.barWidthRatio, safeMax, visualData]);

  function formatOrderIdLabel(orderId: string) {
    return orderId.slice(0, 6).toUpperCase();
  }

  function handleSegmentPointerEnter(
    event: React.MouseEvent<SVGRectElement>,
    input: { segmentKey: string; orderId: string; amountCrc: number; dayLabel: string },
  ) {
    if (!chartContainerRef.current) {
      return;
    }

    const rect = chartContainerRef.current.getBoundingClientRect();
    setActiveSegmentKey(input.segmentKey);
    setActiveTooltip({
      x: event.clientX - rect.left + 10,
      y: event.clientY - rect.top - 14,
      orderIdLabel: formatOrderIdLabel(input.orderId),
      amountCrc: input.amountCrc,
      dayLabel: input.dayLabel,
    });
  }

  function handleSegmentPointerLeave() {
    setActiveSegmentKey(null);
    setActiveTooltip(null);
  }

  function handleSegmentClick(orderId: string) {
    router.push(`/orders/${encodeURIComponent(orderId)}`);
  }

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
            <div ref={chartContainerRef} className="relative h-72">
              <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible" preserveAspectRatio="none">
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

                {stackedBars.map((bar, barIndex) =>
                  bar.segments.map((segment, segmentIndex) => (
                    <rect
                      key={`${bar.point.date}-${segment.orderId}-${segmentIndex}`}
                      x={segment.x}
                      y={segment.y}
                      width={segment.width}
                      height={segment.height}
                      rx={0.6}
                      fill="hsl(var(--chart-1))"
                      opacity={
                        activeSegmentKey === `${bar.point.date}-${segment.orderId}-${segmentIndex}`
                          ? 0.94
                          : 0.74
                      }
                      stroke={
                        activeSegmentKey === `${bar.point.date}-${segment.orderId}-${segmentIndex}`
                          ? "rgba(255,255,255,0.9)"
                          : "transparent"
                      }
                      strokeWidth={
                        activeSegmentKey === `${bar.point.date}-${segment.orderId}-${segmentIndex}`
                          ? 0.45
                          : 0
                      }
                      className="cursor-pointer transition-all duration-150"
                      onMouseEnter={(event) =>
                        handleSegmentPointerEnter(event, {
                          segmentKey: `${bar.point.date}-${segment.orderId}-${segmentIndex}`,
                          orderId: segment.orderId,
                          amountCrc: segment.amountCrc,
                          dayLabel: bar.point.label,
                        })
                      }
                      onMouseMove={(event) =>
                        handleSegmentPointerEnter(event, {
                          segmentKey: `${bar.point.date}-${segment.orderId}-${segmentIndex}`,
                          orderId: segment.orderId,
                          amountCrc: segment.amountCrc,
                          dayLabel: bar.point.label,
                        })
                      }
                      onClick={() => handleSegmentClick(segment.orderId)}
                      onMouseLeave={handleSegmentPointerLeave}
                    />
                  )),
                )}
              </svg>
              {activeTooltip ? (
                <div
                  className="pointer-events-none absolute z-20 w-max max-w-[220px] rounded-xl border border-border/80 bg-white/95 px-3 py-2 text-xs shadow-[0_14px_30px_rgba(15,23,42,0.18)] backdrop-blur-[2px]"
                  style={{
                    left: Math.max(8, activeTooltip.x),
                    top: Math.max(8, activeTooltip.y),
                  }}
                >
                  <p className="font-semibold text-slate-900">Orden {activeTooltip.orderIdLabel}</p>
                  <p className="mt-1 text-slate-700">{formatCurrencyCRC(activeTooltip.amountCrc)}</p>
                  <p className="mt-1 text-muted-foreground">Fecha: {activeTooltip.dayLabel}</p>
                </div>
              ) : null}
            </div>

            <div
              className="grid gap-1 text-[11px] text-muted-foreground"
              style={{
                gridTemplateColumns: `repeat(${Math.max(visualData.length, 1)}, minmax(0, 1fr))`,
              }}
            >
              {visualData.map((point, index) => (
                <div key={point.date} className="min-w-0 text-center">
                  {index % presentation.labelStep === 0 ? (
                    <div className="space-y-1">
                      <p className="truncate font-medium text-slate-600">{point.label}</p>
                      <p className="truncate">{formatCurrencyCRC(point.revenueCrc)}</p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <p className="text-sm leading-6 text-slate-700">{reading}</p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-2xl bg-slate-950 px-4 py-4 text-center text-white">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Revenue</p>
              <p className="mt-2 text-xl font-semibold">{formatCurrencyCRC(totalRevenue)}</p>
            </div>
            <div className="rounded-2xl bg-secondary px-4 py-4 text-center text-secondary-foreground">
              <p className="text-xs uppercase tracking-[0.18em]">Orders</p>
              <p className="mt-2 text-xl font-semibold">{totalOrders.toLocaleString("es-CR")}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-4 text-center">
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

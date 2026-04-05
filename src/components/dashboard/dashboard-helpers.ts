import type {
  DashboardDailyRevenuePoint,
  DashboardDailySalesRangeDays,
  DashboardMetric,
} from "@/server/services/dashboard/types";
import { formatCurrencyCRC, formatDateTime } from "@/lib/formatters";

export function getMetricChangeLabel(metric: DashboardMetric): string {
  if (metric.value === 0) {
    return "Sin movimiento todavía";
  }

  switch (metric.key) {
    case "revenueTotal":
      return "Valor acumulado con ingreso reconocido";
    case "totalOrders":
      return "Pedidos registrados en operación";
    case "customersWithPurchase":
      return "Base de clientes ya monetizada";
    case "activeConversations":
      return "Conversaciones en seguimiento activo";
    default:
      return metric.description;
  }
}

export function getRevenueChartBounds(points: DashboardDailyRevenuePoint[]) {
  const values = points.map((point) => point.revenueCrc);
  const max = Math.max(...values, 0);
  const safeMax = max === 0 ? 1 : max;
  const totalRevenue = values.reduce((sum, value) => sum + value, 0);
  const totalOrders = points.reduce((sum, point) => sum + point.orders, 0);

  return {
    max,
    safeMax,
    totalRevenue,
    totalOrders,
  };
}

export function getAverageDailyRevenue(points: DashboardDailyRevenuePoint[], days: number) {
  const totalRevenue = points.reduce((sum, point) => sum + point.revenueCrc, 0);

  if (days <= 0 || totalRevenue === 0) {
    return 0;
  }

  return totalRevenue / days;
}

export function getRevenueChartPath(points: DashboardDailyRevenuePoint[], safeMax: number) {
  if (points.length === 0) {
    return {
      line: "",
      area: "",
      coordinates: [] as Array<{ x: number; y: number }>,
    };
  }

  const width = 100;
  const height = 100;
  const step = points.length > 1 ? width / (points.length - 1) : width;

  const coordinates = points.map((point, index) => {
    const x = index * step;
    const y = height - (point.revenueCrc / safeMax) * height;
    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
    };
  });

  return {
    line: coordinates.map((coordinate) => `${coordinate.x},${coordinate.y}`).join(" "),
    area: [
      `0,100`,
      ...coordinates.map((coordinate) => `${coordinate.x},${coordinate.y}`),
      `${width},100`,
    ].join(" "),
    coordinates,
  };
}

type RevenueChartPresentation = {
  series: DashboardDailyRevenuePoint[];
  labelStep: number;
  barWidthRatio: number;
};

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function normalizeShortMonthLabel(value: string) {
  return value.replace(/\./g, "").toLowerCase();
}

function formatWeekRangeLabel(startDate: Date, endDate: Date) {
  const startDay = startDate.getUTCDate();
  const endDay = endDate.getUTCDate();
  const startMonth = normalizeShortMonthLabel(
    new Intl.DateTimeFormat("es-CR", {
      month: "short",
      timeZone: "UTC",
    }).format(startDate),
  );
  const endMonth = normalizeShortMonthLabel(
    new Intl.DateTimeFormat("es-CR", {
      month: "short",
      timeZone: "UTC",
    }).format(endDate),
  );

  if (startMonth === endMonth) {
    return `${startDay}-${endDay} ${endMonth}`;
  }

  return `${startDay} ${startMonth}-${endDay} ${endMonth}`;
}

function aggregateRevenueSeriesByWeek(
  points: DashboardDailyRevenuePoint[],
): DashboardDailyRevenuePoint[] {
  if (points.length === 0) {
    return [];
  }

  const sorted = [...points].sort((left, right) => left.date.localeCompare(right.date));
  const weeklyPoints: DashboardDailyRevenuePoint[] = [];

  for (let index = 0; index < sorted.length; index += 7) {
    const chunk = sorted.slice(index, index + 7);
    const first = chunk[0];
    const last = chunk[chunk.length - 1];

    if (!first || !last) {
      continue;
    }

    weeklyPoints.push({
      date: first.date,
      label: formatWeekRangeLabel(parseDateOnly(first.date), parseDateOnly(last.date)),
      revenueCrc: chunk.reduce((sum, point) => sum + point.revenueCrc, 0),
      orders: chunk.reduce((sum, point) => sum + point.orders, 0),
      orderBreakdown: chunk.flatMap((point) => point.orderBreakdown),
    });
  }

  return weeklyPoints;
}

export function getRevenueChartPresentation(
  points: DashboardDailyRevenuePoint[],
  selectedDays: DashboardDailySalesRangeDays,
): RevenueChartPresentation {
  if (selectedDays === 30) {
    return {
      series: aggregateRevenueSeriesByWeek(points),
      labelStep: 1,
      barWidthRatio: 0.52,
    };
  }

  if (selectedDays === 15) {
    return {
      series: points,
      labelStep: 3,
      barWidthRatio: 0.44,
    };
  }

  return {
    series: points,
    labelStep: 1,
    barWidthRatio: 0.5,
  };
}

export function formatMetricValue(metric: DashboardMetric) {
  return metric.key === "revenueTotal" ? formatCurrencyCRC(metric.value) : metric.value.toLocaleString("es-CR");
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("es-CR", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function formatLastUpdated(value: string) {
  return formatDateTime(value);
}

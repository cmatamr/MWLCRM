import type { DashboardDailyRevenuePoint, DashboardMetric } from "@/server/services/dashboard/types";
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

  return {
    max,
    safeMax,
    totalRevenue: values.reduce((sum, value) => sum + value, 0),
    totalOrders: points.reduce((sum, point) => sum + point.orders, 0),
  };
}

export function getRevenueChartPath(points: DashboardDailyRevenuePoint[], safeMax: number) {
  if (points.length === 0) {
    return {
      line: "",
      area: "",
    };
  }

  const width = 100;
  const height = 100;
  const step = points.length > 1 ? width / (points.length - 1) : width;

  const coordinates = points.map((point, index) => {
    const x = index * step;
    const y = height - (point.revenueCrc / safeMax) * height;
    return `${x},${Number(y.toFixed(2))}`;
  });

  return {
    line: coordinates.join(" "),
    area: [`0,100`, ...coordinates, `${width},100`].join(" "),
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

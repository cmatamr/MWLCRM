import type {
  Campaign,
  CampaignSpend,
  Contact,
  LeadThread,
  Order,
} from "@prisma/client";

import { calculatePercentage, toNullableIsoDate, toNumber } from "@/server/services/shared";

import type {
  DashboardCampaignItem,
  DashboardDailyRevenuePoint,
  DashboardFunnelOverview,
  DashboardFunnelStage,
  DashboardMetric,
  DashboardRecentOrder,
  DashboardSummary,
} from "./types";
import { mapCustomerReference } from "@/domain/crm/mappers";

type OrderWithContact = Order & {
  contact: Pick<Contact, "id" | "displayName"> | null;
};

type RevenueOrderRecord = Pick<Order, "id" | "createdAt" | "totalCrc">;

type CampaignWithSpend = Pick<
  Campaign,
  "id" | "name" | "platform" | "objective" | "startDate" | "endDate"
> & {
  campaignSpends: Pick<CampaignSpend, "amountCrc">[];
};

function getTimeZoneDayParts(input: { date: Date; timeZone: string }) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: input.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(input.date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return null;
  }

  return {
    year,
    month,
    day,
  };
}

function getTimeZoneDayKey(input: { date: Date; timeZone: string }) {
  const parts = getTimeZoneDayParts(input);

  if (!parts) {
    return null;
  }

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatTimeZoneDayLabel(input: { date: Date; timeZone: string }) {
  return new Intl.DateTimeFormat("es-CR", {
    month: "short",
    day: "numeric",
    timeZone: input.timeZone,
  }).format(input.date);
}

export function mapDashboardMetric(input: {
  key: DashboardMetric["key"];
  label: string;
  value: number;
  description: string;
}): DashboardMetric {
  return input;
}

export function mapDashboardRecentOrder(order: OrderWithContact): DashboardRecentOrder {
  return {
    id: order.id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalCrc: order.totalCrc,
    createdAt: order.createdAt.toISOString(),
    deliveryDate: toNullableIsoDate(order.deliveryDate),
    customer: mapCustomerReference({
      id: order.contact?.id,
      name: order.contact?.displayName,
    }),
  };
}

export function mapDashboardRevenueSeries(input: {
  days: number;
  orders: RevenueOrderRecord[];
  timeZone: string;
  now: Date;
}): DashboardDailyRevenuePoint[] {
  const buckets = new Map<string, DashboardDailyRevenuePoint>();

  for (let index = 0; index < input.days; index += 1) {
    const date = new Date(input.now);
    date.setUTCDate(input.now.getUTCDate() - (input.days - 1 - index));
    const key = getTimeZoneDayKey({
      date,
      timeZone: input.timeZone,
    });

    if (!key) {
      continue;
    }

    buckets.set(key, {
      date: key,
      label: formatTimeZoneDayLabel({
        date,
        timeZone: input.timeZone,
      }),
      revenueCrc: 0,
      orders: 0,
      orderBreakdown: [],
    });
  }

  for (const order of input.orders) {
    const key = getTimeZoneDayKey({
      date: order.createdAt,
      timeZone: input.timeZone,
    });

    if (!key) {
      continue;
    }

    const bucket = buckets.get(key);

    if (!bucket) {
      continue;
    }

    bucket.revenueCrc += order.totalCrc;
    bucket.orders += 1;
    bucket.orderBreakdown.push({
      orderId: order.id,
      amountCrc: order.totalCrc,
    });
  }

  return [...buckets.values()];
}

export function mapDashboardCampaignItem(input: {
  campaign: CampaignWithSpend;
  attributedLeads: number;
  now: Date;
}): DashboardCampaignItem {
  return {
    id: input.campaign.id,
    name: input.campaign.name,
    platform: input.campaign.platform,
    objective: input.campaign.objective,
    spendCrc: input.campaign.campaignSpends.reduce(
      (sum, spend) => sum + toNumber(spend.amountCrc),
      0,
    ),
    attributedLeads: input.attributedLeads,
    startDate: toNullableIsoDate(input.campaign.startDate),
    endDate: toNullableIsoDate(input.campaign.endDate),
    isActive: !input.campaign.endDate || input.campaign.endDate >= input.now,
  };
}

export function mapDashboardFunnelOverview(input: {
  totalLeads: number;
  activeLeads: number;
  wonLeads: number;
  lostLeads: number;
  stages: DashboardFunnelStage[];
}): DashboardFunnelOverview {
  return {
    totalLeads: input.totalLeads,
    activeLeads: input.activeLeads,
    wonLeads: input.wonLeads,
    lostLeads: input.lostLeads,
    winRate: calculatePercentage(input.wonLeads, input.totalLeads),
    stages: input.stages,
  };
}

export function mapDashboardSummary(input: {
  generatedAt: Date;
  revenueWindowDays: number;
  metrics: DashboardMetric[];
  revenueSeries: DashboardDailyRevenuePoint[];
  recentOrders: OrderWithContact[];
  campaignOverview: DashboardSummary["campaignOverview"];
  funnelOverview: DashboardFunnelOverview;
}): DashboardSummary {
  const mappedRecentOrders = input.recentOrders.map(mapDashboardRecentOrder);
  const hasData =
    input.metrics.some((metric) => metric.value > 0) ||
    input.revenueSeries.some((point) => point.revenueCrc > 0 || point.orders > 0) ||
    mappedRecentOrders.length > 0 ||
    input.campaignOverview.activeCampaigns > 0 ||
    input.funnelOverview.totalLeads > 0;

  return {
    generatedAt: input.generatedAt.toISOString(),
    hasData,
    revenueWindowDays: input.revenueWindowDays,
    metrics: input.metrics,
    revenueSeries: input.revenueSeries,
    recentOrders: mappedRecentOrders,
    campaignOverview: input.campaignOverview,
    funnelOverview: input.funnelOverview,
  };
}

export type { CampaignWithSpend, OrderWithContact, LeadThread };

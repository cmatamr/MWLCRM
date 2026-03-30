import type {
  Campaign,
  CampaignSpend,
  Contact,
  LeadThread,
  Order,
  OrderStatusEnum,
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

type CampaignWithSpend = Pick<
  Campaign,
  "id" | "name" | "platform" | "objective" | "startDate" | "endDate"
> & {
  campaignSpends: Pick<CampaignSpend, "amountCrc">[];
};

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("es-CR", {
  month: "short",
  day: "numeric",
});

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
    customer: mapCustomerReference({
      id: order.contact?.id,
      name: order.contact?.displayName,
    }),
  };
}

export function mapDashboardRevenueSeries(input: {
  startDate: Date;
  days: number;
  orders: Pick<Order, "createdAt" | "totalCrc" | "status">[];
  successfulStatuses: OrderStatusEnum[];
}): DashboardDailyRevenuePoint[] {
  const buckets = new Map<string, DashboardDailyRevenuePoint>();

  for (let index = 0; index < input.days; index += 1) {
    const date = new Date(input.startDate);
    date.setUTCDate(input.startDate.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);

    buckets.set(key, {
      date: key,
      label: SHORT_DATE_FORMATTER.format(date),
      revenueCrc: 0,
      orders: 0,
    });
  }

  for (const order of input.orders) {
    if (!input.successfulStatuses.includes(order.status)) {
      continue;
    }

    const key = order.createdAt.toISOString().slice(0, 10);
    const bucket = buckets.get(key);

    if (!bucket) {
      continue;
    }

    bucket.revenueCrc += order.totalCrc;
    bucket.orders += 1;
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

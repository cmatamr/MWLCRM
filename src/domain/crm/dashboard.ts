import type { LeadStageType, OrderStatusEnum } from "@prisma/client";

import type { CustomerReference } from "./common";

export const SUPPORTED_DASHBOARD_DAILY_SALES_DAYS = [7, 15, 30] as const;
export const DEFAULT_DASHBOARD_DAILY_SALES_DAYS = 15;

export type DashboardDailySalesRangeDays =
  (typeof SUPPORTED_DASHBOARD_DAILY_SALES_DAYS)[number];

export type DashboardMetricKey =
  | "revenueTotal"
  | "totalOrders"
  | "customersWithPurchase"
  | "activeConversations";

export interface DashboardMetric {
  key: DashboardMetricKey;
  label: string;
  value: number;
  description: string;
}

export interface DashboardDailyRevenuePoint {
  date: string;
  label: string;
  revenueCrc: number;
  orders: number;
  orderBreakdown: Array<{
    orderId: string;
    amountCrc: number;
  }>;
}

export interface DashboardRecentOrder {
  id: string;
  status: OrderStatusEnum;
  paymentStatus: string;
  totalCrc: number;
  createdAt: string;
  deliveryDate: string | null;
  customer: CustomerReference;
}

export interface DashboardCampaignItem {
  id: string;
  name: string;
  platform: string | null;
  objective: string | null;
  spendCrc: number;
  attributedLeads: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}

export interface DashboardCampaignOverview {
  activeCampaigns: number;
  totalSpendCrc: number;
  totalAttributedLeads: number;
  topCampaigns: DashboardCampaignItem[];
}

export interface DashboardFunnelStage {
  stage: LeadStageType;
  threadCount: number;
  sharePercent: number;
  averageDurationHours: number;
  revenueCrc: number;
}

export interface DashboardFunnelOverview {
  totalLeads: number;
  activeLeads: number;
  wonLeads: number;
  lostLeads: number;
  winRate: number;
  stages: DashboardFunnelStage[];
}

export interface DashboardSummary {
  generatedAt: string;
  hasData: boolean;
  revenueWindowDays: number;
  metrics: DashboardMetric[];
  revenueSeries: DashboardDailyRevenuePoint[];
  recentOrders: DashboardRecentOrder[];
  campaignOverview: DashboardCampaignOverview;
  funnelOverview: DashboardFunnelOverview;
}

import type { OrderStatusEnum } from "@prisma/client";

import type { CustomerReference, PagedResponse, PaginationParams } from "./common";

export interface ListCampaignsParams extends PaginationParams {
  search?: string;
}

export interface CampaignPerformanceSummary {
  totalSpendCrc: number;
  attributedLeads: number;
  attributedOrders: number;
  attributedRevenueCrc: number;
  roas: number;
  leadToOrderConversionRate: number;
  averageOrderValueCrc: number;
  costPerLeadCrc: number;
  revenuePerLeadCrc: number;
}

export interface CampaignLeadQualitySummary {
  totalLeads: number;
  progressedLeads: number;
  qualifiedLeads: number;
  quotedLeads: number;
  wonLeads: number;
  progressRate: number;
  qualificationRate: number;
  quoteRate: number;
  winRate: number;
}

export interface CampaignAlertSummary {
  spendWithoutRevenueCount: number;
  highLeadNoOrderCount: number;
  highRoasCount: number;
}

export interface CampaignsOverviewSummary
  extends CampaignPerformanceSummary,
    CampaignLeadQualitySummary,
    CampaignAlertSummary {
  totalCampaigns: number;
}

export interface CampaignListItem {
  id: string;
  name: string;
  platform: string | null;
  objective: string | null;
  startDate: string | null;
  endDate: string | null;
  totalSpendCrc: number;
  leads: number;
  orders: number;
  revenueCrc: number;
  roas: number;
  conversionRate: number;
}

export interface CampaignsListResponse extends PagedResponse<CampaignListItem> {
  overview: CampaignsOverviewSummary;
}

export interface CampaignSpendPoint {
  date: string;
  label: string;
  spendCrc: number;
}

export interface CampaignAttributedLead {
  leadThreadId: string;
  leadThreadKey: string;
  firstTouchAt: string;
  customer: CustomerReference;
  orders: number;
  revenueCrc: number;
}

export interface CampaignAttributedOrder {
  id: string;
  status: OrderStatusEnum;
  paymentStatus: string;
  totalCrc: number;
  createdAt: string;
  customer: CustomerReference;
  conversation: {
    id: string;
    leadThreadKey: string;
  };
}

export interface CampaignDetail {
  campaign: {
    id: string;
    name: string;
    platform: string | null;
    objective: string | null;
    startDate: string | null;
    endDate: string | null;
    createdAt: string | null;
  };
  summary: CampaignPerformanceSummary;
  spendSeries: CampaignSpendPoint[];
  attributedLeads: CampaignAttributedLead[];
  attributedOrders: CampaignAttributedOrder[];
}

export interface CampaignKpis extends CampaignPerformanceSummary {
  campaignId: string;
}

import type { Campaign, Contact, LeadThread, Order, Prisma } from "@prisma/client";

import { mapCustomerReference } from "@/domain/crm/mappers";
import { calculatePercentage, toNullableIsoDate, toNumber } from "@/server/services/shared";

import type {
  CampaignAttributedLead,
  CampaignAttributedOrder,
  CampaignDetail,
  CampaignKpis,
  CampaignListItem,
  CampaignPerformanceSummary,
  CampaignSpendPoint,
} from "./types";

const shortDateFormatter = new Intl.DateTimeFormat("es-CR", {
  month: "short",
  day: "numeric",
});

type CampaignListRecord = Pick<
  Campaign,
  "id" | "name" | "platform" | "objective" | "startDate" | "endDate"
>;

type CampaignDetailRecord = Pick<
  Campaign,
  "id" | "name" | "platform" | "objective" | "startDate" | "endDate" | "createdAt"
>;

type CampaignAttributedOrderRecord = Pick<
  Order,
  "id" | "status" | "paymentStatus" | "totalCrc" | "createdAt"
> & {
  contact: Pick<Contact, "id" | "displayName"> | null;
  leadThread: Pick<LeadThread, "id" | "leadThreadKey">;
};

export function mapCampaignPerformanceSummary(input: {
  totalSpendCrc: number;
  attributedLeads: number;
  attributedOrders: number;
  attributedRevenueCrc: number;
}): CampaignPerformanceSummary {
  return {
    totalSpendCrc: input.totalSpendCrc,
    attributedLeads: input.attributedLeads,
    attributedOrders: input.attributedOrders,
    attributedRevenueCrc: input.attributedRevenueCrc,
    roas:
      input.totalSpendCrc > 0
        ? Number((input.attributedRevenueCrc / input.totalSpendCrc).toFixed(2))
        : 0,
    leadToOrderConversionRate: calculatePercentage(
      input.attributedOrders,
      input.attributedLeads,
    ),
    averageOrderValueCrc:
      input.attributedOrders > 0
        ? Number((input.attributedRevenueCrc / input.attributedOrders).toFixed(2))
        : 0,
    costPerLeadCrc:
      input.attributedLeads > 0
        ? Number((input.totalSpendCrc / input.attributedLeads).toFixed(2))
        : 0,
    revenuePerLeadCrc:
      input.attributedLeads > 0
        ? Number((input.attributedRevenueCrc / input.attributedLeads).toFixed(2))
        : 0,
  };
}

export function mapCampaignKpis(input: {
  campaignId: string;
  totalSpendCrc: number;
  attributedLeads: number;
  attributedOrders: number;
  attributedRevenueCrc: number;
}): CampaignKpis {
  return {
    campaignId: input.campaignId,
    ...mapCampaignPerformanceSummary(input),
  };
}

export function mapCampaignListItem(input: {
  campaign: CampaignListRecord;
  summary: CampaignPerformanceSummary;
}): CampaignListItem {
  return {
    id: input.campaign.id,
    name: input.campaign.name,
    platform: input.campaign.platform,
    objective: input.campaign.objective,
    startDate: toNullableIsoDate(input.campaign.startDate),
    endDate: toNullableIsoDate(input.campaign.endDate),
    totalSpendCrc: input.summary.totalSpendCrc,
    leads: input.summary.attributedLeads,
    orders: input.summary.attributedOrders,
    revenueCrc: input.summary.attributedRevenueCrc,
  };
}

export function mapCampaignSpendSeries(
  spendRows: { date: Date; amountCrc: Prisma.Decimal }[],
): CampaignSpendPoint[] {
  const spendByDate = new Map<string, number>();

  for (const row of spendRows) {
    const date = row.date.toISOString().slice(0, 10);
    spendByDate.set(date, (spendByDate.get(date) ?? 0) + toNumber(row.amountCrc));
  }

  return [...spendByDate.entries()]
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .map(([date, spendCrc]) => ({
      date,
      label: shortDateFormatter.format(new Date(`${date}T00:00:00.000Z`)),
      spendCrc,
    }));
}

export function mapCampaignAttributedLead(input: {
  leadThreadId: string;
  leadThreadKey: string;
  firstTouchAt: Date;
  customerId: string | null;
  customerName: string | null;
  orders: number;
  revenueCrc: number;
}): CampaignAttributedLead {
  return {
    leadThreadId: input.leadThreadId,
    leadThreadKey: input.leadThreadKey,
    firstTouchAt: input.firstTouchAt.toISOString(),
    customer: mapCustomerReference({
      id: input.customerId,
      name: input.customerName,
    }),
    orders: input.orders,
    revenueCrc: input.revenueCrc,
  };
}

export function mapCampaignAttributedOrder(
  order: CampaignAttributedOrderRecord,
): CampaignAttributedOrder {
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
    conversation: {
      id: order.leadThread.id,
      leadThreadKey: order.leadThread.leadThreadKey,
    },
  };
}

export function mapCampaignDetail(input: {
  campaign: CampaignDetailRecord;
  summary: CampaignPerformanceSummary;
  spendSeries: CampaignSpendPoint[];
  attributedLeads: CampaignAttributedLead[];
  attributedOrders: CampaignAttributedOrder[];
}): CampaignDetail {
  return {
    campaign: {
      id: input.campaign.id,
      name: input.campaign.name,
      platform: input.campaign.platform,
      objective: input.campaign.objective,
      startDate: toNullableIsoDate(input.campaign.startDate),
      endDate: toNullableIsoDate(input.campaign.endDate),
      createdAt: input.campaign.createdAt?.toISOString() ?? null,
    },
    summary: input.summary,
    spendSeries: input.spendSeries,
    attributedLeads: input.attributedLeads,
    attributedOrders: input.attributedOrders,
  };
}

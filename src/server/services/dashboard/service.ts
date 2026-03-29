import { LeadStageType, OrderStatusEnum } from "@prisma/client";

import { getFunnelSummary, type FunnelStageSummary } from "@/server/services/funnel";
import { calculatePercentage, resolveDb, ServiceOptions } from "@/server/services/shared";

import {
  mapDashboardCampaignItem,
  mapDashboardFunnelOverview,
  mapDashboardMetric,
  mapDashboardRevenueSeries,
  mapDashboardSummary,
} from "./mappers";
import type {
  DashboardCampaignItem,
  DashboardFunnelStage,
  DashboardSummary,
} from "./types";

const ACTIVE_LEAD_STAGES: LeadStageType[] = [
  LeadStageType.new,
  LeadStageType.qualified,
  LeadStageType.quote,
];

const SUCCESSFUL_ORDER_STATUSES: OrderStatusEnum[] = [
  OrderStatusEnum.confirmed,
  OrderStatusEnum.ready,
  OrderStatusEnum.shipped,
  OrderStatusEnum.completed,
];

const DASHBOARD_REVENUE_WINDOW_DAYS = 14;
const RECENT_ORDERS_LIMIT = 6;
const TOP_CAMPAIGNS_LIMIT = 3;

function getRevenueWindowStart(days: number): Date {
  const startDate = new Date();
  startDate.setUTCHours(0, 0, 0, 0);
  startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
  return startDate;
}

function mapFunnelStage(stage: FunnelStageSummary): DashboardFunnelStage {
  return {
    stage: stage.stage,
    threadCount: stage.threadCount,
    sharePercent: stage.sharePercent,
    averageDurationHours: stage.averageDurationHours,
    revenueCrc: stage.revenueCrc,
  };
}

function buildCampaignLeadCountMap(input: {
  campaignIds: string[];
  attributions: {
    campaignUuid: string | null;
    campaignId: string | null;
    leadThreadId: string;
  }[];
}): Map<string, number> {
  const attributionMap = new Map<string, Set<string>>();

  for (const attribution of input.attributions) {
    const keys = [attribution.campaignUuid, attribution.campaignId].filter(
      (value): value is string => Boolean(value && input.campaignIds.includes(value)),
    );

    for (const key of keys) {
      const bucket = attributionMap.get(key) ?? new Set<string>();
      bucket.add(attribution.leadThreadId);
      attributionMap.set(key, bucket);
    }
  }

  return new Map<string, number>(
    input.campaignIds.map((campaignId) => [campaignId, attributionMap.get(campaignId)?.size ?? 0]),
  );
}

export async function getDashboardSummary(options?: ServiceOptions): Promise<DashboardSummary> {
  const db = resolveDb(options);
  const now = new Date();
  const revenueWindowStart = getRevenueWindowStart(DASHBOARD_REVENUE_WINDOW_DAYS);

  const [
    totalOrders,
    customersWithPurchase,
    activeConversations,
    revenueAggregate,
    recentOrders,
    revenueOrders,
    activeCampaigns,
    funnelSummary,
  ] = await Promise.all([
    db.order.count(),
    db.contact.count({
      where: {
        orders: {
          some: {},
        },
      },
    }),
    db.leadThread.count({
      where: {
        leadStage: {
          in: ACTIVE_LEAD_STAGES,
        },
      },
    }),
    db.order.aggregate({
      _sum: {
        totalCrc: true,
      },
      where: {
        status: {
          in: SUCCESSFUL_ORDER_STATUSES,
        },
      },
    }),
    db.order.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: RECENT_ORDERS_LIMIT,
      include: {
        contact: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    }),
    db.order.findMany({
      where: {
        createdAt: {
          gte: revenueWindowStart,
        },
        status: {
          in: SUCCESSFUL_ORDER_STATUSES,
        },
      },
      select: {
        createdAt: true,
        totalCrc: true,
        status: true,
      },
    }),
    db.campaign.findMany({
      where: {
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        platform: true,
        objective: true,
        startDate: true,
        endDate: true,
        campaignSpends: {
          select: {
            amountCrc: true,
          },
        },
      },
    }),
    getFunnelSummary(options),
  ]);

  const campaignLeadCountMap = buildCampaignLeadCountMap({
    campaignIds: activeCampaigns.map((campaign) => campaign.id),
    attributions:
      activeCampaigns.length > 0
        ? await db.campaignAttribution.findMany({
            where: {
              OR: [
                { campaignUuid: { in: activeCampaigns.map((campaign) => campaign.id) } },
                { campaignId: { in: activeCampaigns.map((campaign) => campaign.id) } },
              ],
            },
            select: {
              campaignUuid: true,
              campaignId: true,
              leadThreadId: true,
            },
          })
        : [],
  });

  const campaignItems = activeCampaigns.map((campaign) =>
    mapDashboardCampaignItem({
      campaign,
      attributedLeads: campaignLeadCountMap.get(campaign.id) ?? 0,
      now,
    }),
  );

  const topCampaigns: DashboardCampaignItem[] = [...campaignItems]
    .sort((left, right) => {
      if (right.attributedLeads !== left.attributedLeads) {
        return right.attributedLeads - left.attributedLeads;
      }

      return right.spendCrc - left.spendCrc;
    })
    .slice(0, TOP_CAMPAIGNS_LIMIT);

  return mapDashboardSummary({
    generatedAt: now,
    metrics: [
      mapDashboardMetric({
        key: "revenueTotal",
        label: "Revenue total",
        value: revenueAggregate._sum.totalCrc ?? 0,
        description: "Ingresos cerrados en órdenes confirmadas, listas, enviadas o completadas.",
      }),
      mapDashboardMetric({
        key: "totalOrders",
        label: "Total orders",
        value: totalOrders,
        description: "Pedidos creados dentro del CRM, sin importar su estado.",
      }),
      mapDashboardMetric({
        key: "customersWithPurchase",
        label: "Clientes con compra",
        value: customersWithPurchase,
        description: "Contactos que ya registran al menos una orden asociada.",
      }),
      mapDashboardMetric({
        key: "activeConversations",
        label: "Conversations activas",
        value: activeConversations,
        description: "Hilos en etapas activas del funnel comercial.",
      }),
    ],
    revenueSeries: mapDashboardRevenueSeries({
      startDate: revenueWindowStart,
      days: DASHBOARD_REVENUE_WINDOW_DAYS,
      orders: revenueOrders,
      successfulStatuses: SUCCESSFUL_ORDER_STATUSES,
    }),
    recentOrders,
    campaignOverview: {
      activeCampaigns: campaignItems.length,
      totalSpendCrc: campaignItems.reduce((sum, campaign) => sum + campaign.spendCrc, 0),
      totalAttributedLeads: campaignItems.reduce(
        (sum, campaign) => sum + campaign.attributedLeads,
        0,
      ),
      topCampaigns,
    },
    funnelOverview: mapDashboardFunnelOverview({
      totalLeads: funnelSummary.totalLeads,
      activeLeads: funnelSummary.activeLeads,
      wonLeads: funnelSummary.wonLeads,
      lostLeads: funnelSummary.lostLeads,
      stages: funnelSummary.stages.map(mapFunnelStage),
    }),
  });
}

export function getDashboardWinRate(summary: {
  wonLeads: number;
  totalLeads: number;
}): number {
  return calculatePercentage(summary.wonLeads, summary.totalLeads);
}

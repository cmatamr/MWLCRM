import { Prisma } from "@prisma/client";

import {
  createPaginationMeta,
  normalizePagination,
  resolveDb,
  ServiceOptions,
} from "@/server/services/shared";

import {
  mapCampaignAttributedLead,
  mapCampaignAttributedOrder,
  mapCampaignDetail,
  mapCampaignKpis,
  mapCampaignListItem,
  mapCampaignPerformanceSummary,
  mapCampaignSpendSeries,
} from "./mappers";
import type {
  CampaignDetail,
  CampaignKpis,
  CampaignPerformanceSummary,
  CampaignsListResponse,
  ListCampaignsParams,
} from "./types";

type CampaignAttributionRecord = {
  campaignUuid: string | null;
  campaignId: string | null;
  leadThreadId: string;
};

type LeadAttributionDetailRecord = CampaignAttributionRecord & {
  firstTouchAt: Date;
  leadThread: {
    id: string;
    leadThreadKey: string;
    contact: {
      id: string;
      displayName: string | null;
    } | null;
  };
};

type LeadIndexEntry = {
  firstTouchAt: Date;
  leadThreadKey: string;
  customerId: string | null;
  customerName: string | null;
};

type OrderMetric = {
  orders: number;
  revenueCrc: number;
};

function buildCampaignWhere(params: ListCampaignsParams): Prisma.CampaignWhereInput {
  const search = params.search?.trim();

  if (!search) {
    return {};
  }

  return {
    OR: [
      {
        name: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        platform: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        objective: {
          contains: search,
          mode: "insensitive",
        },
      },
    ],
  };
}

function resolveCampaignKeys(
  attribution: CampaignAttributionRecord,
  campaignIdSet: Set<string>,
): string[] {
  const keys: string[] = [];

  if (attribution.campaignUuid && campaignIdSet.has(attribution.campaignUuid)) {
    keys.push(attribution.campaignUuid);
  }

  if (
    attribution.campaignId &&
    campaignIdSet.has(attribution.campaignId) &&
    !keys.includes(attribution.campaignId)
  ) {
    keys.push(attribution.campaignId);
  }

  return keys;
}

function buildCampaignLeadSetMap(
  campaignIds: string[],
  attributions: CampaignAttributionRecord[],
): Map<string, Set<string>> {
  const campaignIdSet = new Set(campaignIds);
  const leadSetMap = new Map<string, Set<string>>();

  for (const campaignId of campaignIds) {
    leadSetMap.set(campaignId, new Set<string>());
  }

  for (const attribution of attributions) {
    for (const campaignKey of resolveCampaignKeys(attribution, campaignIdSet)) {
      leadSetMap.get(campaignKey)?.add(attribution.leadThreadId);
    }
  }

  return leadSetMap;
}

function buildCampaignLeadIndex(
  campaignId: string,
  attributions: LeadAttributionDetailRecord[],
): Map<string, LeadIndexEntry> {
  const campaignIdSet = new Set([campaignId]);
  const leadIndex = new Map<string, LeadIndexEntry>();

  for (const attribution of attributions) {
    if (!resolveCampaignKeys(attribution, campaignIdSet).includes(campaignId)) {
      continue;
    }

    const existingLead = leadIndex.get(attribution.leadThreadId);

    if (!existingLead || attribution.firstTouchAt < existingLead.firstTouchAt) {
      leadIndex.set(attribution.leadThreadId, {
        firstTouchAt: attribution.firstTouchAt,
        leadThreadKey: attribution.leadThread.leadThreadKey,
        customerId: attribution.leadThread.contact?.id ?? null,
        customerName: attribution.leadThread.contact?.displayName ?? null,
      });
    }
  }

  return leadIndex;
}

function buildOrderMetricByLead(
  orders: {
    id: string;
    leadThreadId: string;
    totalCrc: number;
  }[],
): Map<string, OrderMetric> {
  const orderMetricByLead = new Map<string, OrderMetric>();

  for (const order of orders) {
    const currentMetric = orderMetricByLead.get(order.leadThreadId) ?? {
      orders: 0,
      revenueCrc: 0,
    };

    currentMetric.orders += 1;
    currentMetric.revenueCrc += order.totalCrc;

    orderMetricByLead.set(order.leadThreadId, currentMetric);
  }

  return orderMetricByLead;
}

function buildCampaignSummary(input: {
  totalSpendCrc: number;
  leadThreadIds: Iterable<string>;
  orderMetricByLead: Map<string, OrderMetric>;
}): CampaignPerformanceSummary {
  const leadIds = [...input.leadThreadIds];

  let attributedOrders = 0;
  let attributedRevenueCrc = 0;

  for (const leadThreadId of leadIds) {
    const leadMetrics = input.orderMetricByLead.get(leadThreadId);

    if (!leadMetrics) {
      continue;
    }

    attributedOrders += leadMetrics.orders;
    attributedRevenueCrc += leadMetrics.revenueCrc;
  }

  return mapCampaignPerformanceSummary({
    totalSpendCrc: input.totalSpendCrc,
    attributedLeads: leadIds.length,
    attributedOrders,
    attributedRevenueCrc,
  });
}

export async function listCampaigns(
  params: ListCampaignsParams = {},
  options?: ServiceOptions,
): Promise<CampaignsListResponse> {
  const db = resolveDb(options);
  const pagination = normalizePagination(params);
  const where = buildCampaignWhere(params);

  const [total, campaigns] = await db.$transaction([
    db.campaign.count({ where }),
    db.campaign.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip: pagination.skip,
      take: pagination.take,
      select: {
        id: true,
        name: true,
        platform: true,
        objective: true,
        startDate: true,
        endDate: true,
      },
    }),
  ]);

  if (campaigns.length === 0) {
    return {
      items: [],
      pagination: createPaginationMeta({
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
      }),
    };
  }

  const campaignIds = campaigns.map((campaign) => campaign.id);

  const [spendRows, attributions] = await Promise.all([
    db.campaignSpend.groupBy({
      by: ["campaignId"],
      where: {
        campaignId: {
          in: campaignIds,
        },
      },
      _sum: {
        amountCrc: true,
      },
    }),
    db.campaignAttribution.findMany({
      where: {
        OR: [{ campaignUuid: { in: campaignIds } }, { campaignId: { in: campaignIds } }],
      },
      select: {
        campaignUuid: true,
        campaignId: true,
        leadThreadId: true,
      },
    }),
  ]);

  const spendByCampaignId = new Map(
    spendRows.map((row) => [row.campaignId ?? "", row._sum.amountCrc?.toNumber() ?? 0]),
  );
  const leadSetMap = buildCampaignLeadSetMap(campaignIds, attributions);
  const uniqueLeadThreadIds = [...new Set(attributions.map((attribution) => attribution.leadThreadId))];

  const attributedOrders =
    uniqueLeadThreadIds.length > 0
      ? await db.order.findMany({
          where: {
            leadThreadId: {
              in: uniqueLeadThreadIds,
            },
          },
          select: {
            id: true,
            leadThreadId: true,
            totalCrc: true,
          },
        })
      : [];

  const orderMetricByLead = buildOrderMetricByLead(attributedOrders);

  return {
    items: campaigns.map((campaign) =>
      mapCampaignListItem({
        campaign,
        summary: buildCampaignSummary({
          totalSpendCrc: spendByCampaignId.get(campaign.id) ?? 0,
          leadThreadIds: leadSetMap.get(campaign.id) ?? [],
          orderMetricByLead,
        }),
      }),
    ),
    pagination: createPaginationMeta({
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    }),
  };
}

export async function getCampaignDetail(
  campaignId: string,
  options?: ServiceOptions,
): Promise<CampaignDetail | null> {
  const db = resolveDb(options);

  const campaign = await db.campaign.findUnique({
    where: {
      id: campaignId,
    },
    select: {
      id: true,
      name: true,
      platform: true,
      objective: true,
      startDate: true,
      endDate: true,
      createdAt: true,
    },
  });

  if (!campaign) {
    return null;
  }

  const [spendRows, attributions] = await Promise.all([
    db.campaignSpend.findMany({
      where: {
        campaignId,
      },
      orderBy: {
        date: "asc",
      },
      select: {
        date: true,
        amountCrc: true,
      },
    }),
    db.campaignAttribution.findMany({
      where: {
        OR: [{ campaignUuid: campaignId }, { campaignId }],
      },
      orderBy: {
        firstTouchAt: "asc",
      },
      select: {
        campaignUuid: true,
        campaignId: true,
        leadThreadId: true,
        firstTouchAt: true,
        leadThread: {
          select: {
            id: true,
            leadThreadKey: true,
            contact: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const leadIndex = buildCampaignLeadIndex(campaignId, attributions);
  const leadThreadIds = [...leadIndex.keys()];

  const attributedOrders =
    leadThreadIds.length > 0
      ? await db.order.findMany({
          where: {
            leadThreadId: {
              in: leadThreadIds,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            status: true,
            paymentStatus: true,
            totalCrc: true,
            createdAt: true,
            contact: {
              select: {
                id: true,
                displayName: true,
              },
            },
            leadThread: {
              select: {
                id: true,
                leadThreadKey: true,
              },
            },
            leadThreadId: true,
          },
        })
      : [];

  const orderMetricByLead = buildOrderMetricByLead(attributedOrders);
  const totalSpendCrc = spendRows.reduce((sum, spend) => sum + spend.amountCrc.toNumber(), 0);
  const summary = buildCampaignSummary({
    totalSpendCrc,
    leadThreadIds,
    orderMetricByLead,
  });

  return mapCampaignDetail({
    campaign,
    summary,
    spendSeries: mapCampaignSpendSeries(spendRows),
    attributedLeads: leadThreadIds
      .map((leadThreadId) => {
        const lead = leadIndex.get(leadThreadId);

        if (!lead) {
          return null;
        }

        const metrics = orderMetricByLead.get(leadThreadId) ?? { orders: 0, revenueCrc: 0 };

        return mapCampaignAttributedLead({
          leadThreadId,
          leadThreadKey: lead.leadThreadKey,
          firstTouchAt: lead.firstTouchAt,
          customerId: lead.customerId,
          customerName: lead.customerName,
          orders: metrics.orders,
          revenueCrc: metrics.revenueCrc,
        });
      })
      .filter((lead): lead is NonNullable<typeof lead> => lead !== null)
      .sort((left, right) => right.firstTouchAt.localeCompare(left.firstTouchAt)),
    attributedOrders: attributedOrders.map(mapCampaignAttributedOrder),
  });
}

export async function getCampaignKpis(
  campaignId: string,
  options?: ServiceOptions,
): Promise<CampaignKpis | null> {
  const detail = await getCampaignDetail(campaignId, options);

  if (!detail) {
    return null;
  }

  return mapCampaignKpis({
    campaignId,
    totalSpendCrc: detail.summary.totalSpendCrc,
    attributedLeads: detail.summary.attributedLeads,
    attributedOrders: detail.summary.attributedOrders,
    attributedRevenueCrc: detail.summary.attributedRevenueCrc,
  });
}

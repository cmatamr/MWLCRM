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
  mapCampaignsOverview,
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

type CampaignMetricsRow = {
  id: string;
  name: string;
  platform: string | null;
  objective: string | null;
  startDate: Date | null;
  endDate: Date | null;
  totalSpendCrc: number | null;
  attributedLeads: number | bigint | null;
  attributedOrders: number | bigint | null;
  attributedRevenueCrc: number | null;
  totalLeads: number | bigint | null;
  progressedLeads: number | bigint | null;
  qualifiedLeads: number | bigint | null;
  quotedLeads: number | bigint | null;
  wonLeads: number | bigint | null;
};

type CampaignOverviewRow = {
  totalCampaigns: number | bigint | null;
  totalSpendCrc: number | null;
  attributedLeads: number | bigint | null;
  attributedOrders: number | bigint | null;
  attributedRevenueCrc: number | null;
  totalLeads: number | bigint | null;
  progressedLeads: number | bigint | null;
  qualifiedLeads: number | bigint | null;
  quotedLeads: number | bigint | null;
  wonLeads: number | bigint | null;
  spendWithoutRevenueCount: number | bigint | null;
  highLeadNoOrderCount: number | bigint | null;
  highRoasCount: number | bigint | null;
};

function buildCampaignSearchClause(search?: string): Prisma.Sql {
  const normalizedSearch = search?.trim();

  if (!normalizedSearch) {
    return Prisma.empty;
  }

  const likeQuery = `%${normalizedSearch}%`;

  return Prisma.sql`
    WHERE (
      c.name ILIKE ${likeQuery}
      OR COALESCE(c.platform, '') ILIKE ${likeQuery}
      OR COALESCE(c.objective, '') ILIKE ${likeQuery}
    )
  `;
}

function buildCampaignMetricsCte(search?: string): Prisma.Sql {
  return Prisma.sql`
    WITH filtered_campaigns AS (
      SELECT
        c.id,
        c.name,
        c.platform,
        c.objective,
        c.start_date,
        c.end_date,
        c.created_at
      FROM campaigns c
      ${buildCampaignSearchClause(search)}
    ),
    campaign_quality AS (
      SELECT
        ca.campaign_uuid AS campaign_id,
        COUNT(DISTINCT lt.id)::integer AS total_leads,
        COUNT(DISTINCT CASE WHEN lt.lead_stage <> 'new' THEN lt.id END)::integer AS progressed_leads,
        COUNT(DISTINCT CASE WHEN lt.lead_stage = 'qualified' THEN lt.id END)::integer AS qualified_leads,
        COUNT(DISTINCT CASE WHEN lt.lead_stage = 'quote' THEN lt.id END)::integer AS quoted_leads,
        COUNT(DISTINCT CASE WHEN lt.lead_stage = 'won' THEN lt.id END)::integer AS won_leads
      FROM campaign_attribution ca
      JOIN lead_threads lt ON lt.id = ca.lead_thread_id
      WHERE ca.campaign_uuid IS NOT NULL
      GROUP BY ca.campaign_uuid
    )
  `;
}

function normalizeMetricValue(value: Prisma.Decimal | number | bigint | null | undefined): number {
  if (value == null) {
    return 0;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "number") {
    return value;
  }

  return value.toNumber();
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
  const metricsCte = buildCampaignMetricsCte(params.search);

  const [overviewRows, campaignRows] = await Promise.all([
    db.$queryRaw<CampaignOverviewRow[]>(Prisma.sql`
      ${metricsCte}
      SELECT
        COUNT(*)::integer AS "totalCampaigns",
        COALESCE(SUM(COALESCE(k.total_spend, 0)), 0)::double precision AS "totalSpendCrc",
        COALESCE(SUM(COALESCE(k.leads, 0)), 0)::integer AS "attributedLeads",
        COALESCE(SUM(COALESCE(k.orders, 0)), 0)::integer AS "attributedOrders",
        COALESCE(SUM(COALESCE(k.revenue, 0)), 0)::double precision AS "attributedRevenueCrc",
        COALESCE(SUM(COALESCE(q.total_leads, 0)), 0)::integer AS "totalLeads",
        COALESCE(SUM(COALESCE(q.progressed_leads, 0)), 0)::integer AS "progressedLeads",
        COALESCE(SUM(COALESCE(q.qualified_leads, 0)), 0)::integer AS "qualifiedLeads",
        COALESCE(SUM(COALESCE(q.quoted_leads, 0)), 0)::integer AS "quotedLeads",
        COALESCE(SUM(COALESCE(q.won_leads, 0)), 0)::integer AS "wonLeads",
        COUNT(*) FILTER (
          WHERE COALESCE(k.total_spend, 0) > 0 AND COALESCE(k.revenue, 0) = 0
        )::integer AS "spendWithoutRevenueCount",
        COUNT(*) FILTER (
          WHERE COALESCE(k.leads, 0) > 10 AND COALESCE(k.orders, 0) = 0
        )::integer AS "highLeadNoOrderCount",
        COUNT(*) FILTER (
          WHERE COALESCE(k.total_spend, 0) > 0
            AND (COALESCE(k.revenue, 0)::numeric / NULLIF(COALESCE(k.total_spend, 0), 0)) > 3
        )::integer AS "highRoasCount"
      FROM filtered_campaigns fc
      LEFT JOIN campaign_kpi k ON k.id = fc.id
      LEFT JOIN campaign_quality q ON q.campaign_id = fc.id
    `),
    db.$queryRaw<CampaignMetricsRow[]>(Prisma.sql`
      ${metricsCte}
      SELECT
        fc.id::text AS "id",
        fc.name AS "name",
        fc.platform AS "platform",
        fc.objective AS "objective",
        fc.start_date AS "startDate",
        fc.end_date AS "endDate",
        COALESCE(k.total_spend, 0)::double precision AS "totalSpendCrc",
        COALESCE(k.leads, 0)::integer AS "attributedLeads",
        COALESCE(k.orders, 0)::integer AS "attributedOrders",
        COALESCE(k.revenue, 0)::double precision AS "attributedRevenueCrc",
        COALESCE(q.total_leads, 0)::integer AS "totalLeads",
        COALESCE(q.progressed_leads, 0)::integer AS "progressedLeads",
        COALESCE(q.qualified_leads, 0)::integer AS "qualifiedLeads",
        COALESCE(q.quoted_leads, 0)::integer AS "quotedLeads",
        COALESCE(q.won_leads, 0)::integer AS "wonLeads"
      FROM filtered_campaigns fc
      LEFT JOIN campaign_kpi k ON k.id = fc.id
      LEFT JOIN campaign_quality q ON q.campaign_id = fc.id
      ORDER BY fc.created_at DESC NULLS LAST, fc.name ASC
      LIMIT ${pagination.take}
      OFFSET ${pagination.skip}
    `),
  ]);

  const overviewRow = overviewRows[0];
  const totalCampaigns = normalizeMetricValue(overviewRow?.totalCampaigns);
  const overview = mapCampaignsOverview({
    totalCampaigns,
    totalSpendCrc: normalizeMetricValue(overviewRow?.totalSpendCrc),
    attributedLeads: normalizeMetricValue(overviewRow?.attributedLeads),
    attributedOrders: normalizeMetricValue(overviewRow?.attributedOrders),
    attributedRevenueCrc: normalizeMetricValue(overviewRow?.attributedRevenueCrc),
    totalLeads: normalizeMetricValue(overviewRow?.totalLeads),
    progressedLeads: normalizeMetricValue(overviewRow?.progressedLeads),
    qualifiedLeads: normalizeMetricValue(overviewRow?.qualifiedLeads),
    quotedLeads: normalizeMetricValue(overviewRow?.quotedLeads),
    wonLeads: normalizeMetricValue(overviewRow?.wonLeads),
    spendWithoutRevenueCount: normalizeMetricValue(overviewRow?.spendWithoutRevenueCount),
    highLeadNoOrderCount: normalizeMetricValue(overviewRow?.highLeadNoOrderCount),
    highRoasCount: normalizeMetricValue(overviewRow?.highRoasCount),
  });

  return {
    items: campaignRows.map((campaign) =>
      mapCampaignListItem({
        campaign: {
          id: campaign.id,
          name: campaign.name,
          platform: campaign.platform,
          objective: campaign.objective,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
        },
        summary: mapCampaignPerformanceSummary({
          totalSpendCrc: normalizeMetricValue(campaign.totalSpendCrc),
          attributedLeads: normalizeMetricValue(campaign.attributedLeads),
          attributedOrders: normalizeMetricValue(campaign.attributedOrders),
          attributedRevenueCrc: normalizeMetricValue(campaign.attributedRevenueCrc),
        }),
      }),
    ),
    overview,
    pagination: createPaginationMeta({
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: totalCampaigns,
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

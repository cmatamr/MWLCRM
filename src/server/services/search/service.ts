import { Prisma } from "@prisma/client";

import {
  isUuid,
  resolveDb,
  ServiceOptions,
  toNullableIsoDate,
  toNumber,
} from "@/server/services/shared";

import type {
  CampaignSearchResult,
  CustomerSearchResult,
  GlobalSearchResults,
  OrderSearchResult,
} from "./types";

const SEARCH_RESULTS_PER_ENTITY = 6;

function normalizeQuery(query: string | null | undefined): string {
  return query?.trim().replace(/\s+/g, " ").slice(0, 120) ?? "";
}

function escapeLikePattern(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function buildCustomerWhere(query: string): Prisma.ContactWhereInput {
  return {
    OR: [
      {
        displayName: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        externalId: {
          contains: query,
          mode: "insensitive",
        },
      },
    ],
  };
}

function buildOrderWhere(query: string): Prisma.OrderWhereInput {
  const filters: Prisma.OrderWhereInput[] = [
    {
      contact: {
        is: {
          displayName: {
            contains: query,
            mode: "insensitive",
          },
        },
      },
    },
    {
      contact: {
        is: {
          externalId: {
            contains: query,
            mode: "insensitive",
          },
        },
      },
    },
  ];

  if (isUuid(query)) {
    filters.unshift({
      id: query,
    });
  }

  return {
    OR: filters,
  };
}

function buildCampaignWhere(query: string): Prisma.CampaignWhereInput {
  const filters: Prisma.CampaignWhereInput[] = [
    {
      name: {
        contains: query,
        mode: "insensitive",
      },
    },
    {
      platform: {
        contains: query,
        mode: "insensitive",
      },
    },
    {
      objective: {
        contains: query,
        mode: "insensitive",
      },
    },
  ];

  return {
    OR: filters,
  };
}

async function findOrderIdsByPrefix(
  query: string,
  options?: ServiceOptions,
): Promise<string[]> {
  const db = resolveDb(options);
  const escapedQuery = escapeLikePattern(query);
  const rows = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id::text AS id
    FROM orders
    WHERE id::text ILIKE ${`${escapedQuery}%`} ESCAPE '\'
    ORDER BY created_at DESC
    LIMIT ${SEARCH_RESULTS_PER_ENTITY}
  `);

  return rows.map((row) => row.id);
}

async function findCampaignIdsByPrefix(
  query: string,
  options?: ServiceOptions,
): Promise<string[]> {
  const db = resolveDb(options);
  const escapedQuery = escapeLikePattern(query);
  const rows = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id::text AS id
    FROM campaigns
    WHERE id::text ILIKE ${`${escapedQuery}%`} ESCAPE '\'
    ORDER BY created_at DESC NULLS LAST, name ASC
    LIMIT ${SEARCH_RESULTS_PER_ENTITY}
  `);

  return rows.map((row) => row.id);
}

function mapCustomerResult(customer: {
  id: string;
  displayName: string | null;
  externalId: string;
  primaryChannel: CustomerSearchResult["primaryChannel"];
  customerStatus: string | null;
  totalOrders: number | null;
  totalSpentCrc: Prisma.Decimal | number | null;
  lastOrderAt: Date | null;
  createdAt: Date;
}): CustomerSearchResult {
  return {
    id: customer.id,
    displayName: customer.displayName,
    externalId: customer.externalId,
    primaryChannel: customer.primaryChannel,
    customerStatus: customer.customerStatus,
    totalOrders: customer.totalOrders ?? 0,
    totalSpentCrc: toNumber(customer.totalSpentCrc),
    lastOrderAt: toNullableIsoDate(customer.lastOrderAt),
    createdAt: customer.createdAt.toISOString(),
    href: `/customers/${customer.id}`,
  };
}

function mapOrderResult(order: {
  id: string;
  status: OrderSearchResult["status"];
  paymentStatus: string;
  totalCrc: number;
  createdAt: Date;
  contact: {
    id: string;
    displayName: string | null;
    externalId: string;
  } | null;
}): OrderSearchResult {
  return {
    id: order.id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalCrc: order.totalCrc,
    createdAt: order.createdAt.toISOString(),
    customer: {
      id: order.contact?.id ?? null,
      name: order.contact?.displayName ?? null,
      externalId: order.contact?.externalId ?? null,
    },
    href: `/orders/${order.id}`,
  };
}

function mapCampaignResult(campaign: {
  id: string;
  name: string;
  platform: string | null;
  objective: string | null;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date | null;
}): CampaignSearchResult {
  return {
    id: campaign.id,
    name: campaign.name,
    platform: campaign.platform,
    objective: campaign.objective,
    startDate: toNullableIsoDate(campaign.startDate),
    endDate: toNullableIsoDate(campaign.endDate),
    createdAt: toNullableIsoDate(campaign.createdAt),
    href: `/campaigns/${campaign.id}`,
  };
}

export async function searchCrm(
  rawQuery: string | null | undefined,
  options?: ServiceOptions,
): Promise<GlobalSearchResults> {
  const query = normalizeQuery(rawQuery);

  if (!query) {
    return {
      query: "",
      customers: [],
      orders: [],
      campaigns: [],
      totalResults: 0,
    };
  }

  const db = resolveDb(options);
  const [matchingOrderIds, matchingCampaignIds] = await Promise.all([
    findOrderIdsByPrefix(query, options),
    findCampaignIdsByPrefix(query, options),
  ]);

  const [customers, orders, campaigns] = await Promise.all([
    db.contact.findMany({
      where: buildCustomerWhere(query),
      orderBy: {
        updatedAt: "desc",
      },
      take: SEARCH_RESULTS_PER_ENTITY,
      select: {
        id: true,
        displayName: true,
        externalId: true,
        primaryChannel: true,
        customerStatus: true,
        totalOrders: true,
        totalSpentCrc: true,
        lastOrderAt: true,
        createdAt: true,
      },
    }),
    db.order.findMany({
      where: {
        OR: [
          buildOrderWhere(query),
          ...(matchingOrderIds.length > 0
            ? [
                {
                  id: {
                    in: matchingOrderIds,
                  },
                } satisfies Prisma.OrderWhereInput,
              ]
            : []),
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
      take: SEARCH_RESULTS_PER_ENTITY,
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
            externalId: true,
          },
        },
      },
    }),
    db.campaign.findMany({
      where: {
        OR: [
          buildCampaignWhere(query),
          ...(matchingCampaignIds.length > 0
            ? [
                {
                  id: {
                    in: matchingCampaignIds,
                  },
                } satisfies Prisma.CampaignWhereInput,
              ]
            : []),
        ],
      },
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          name: "asc",
        },
      ],
      take: SEARCH_RESULTS_PER_ENTITY,
      select: {
        id: true,
        name: true,
        platform: true,
        objective: true,
        startDate: true,
        endDate: true,
        createdAt: true,
      },
    }),
  ]);

  const mappedCustomers = customers.map(mapCustomerResult);
  const mappedOrders = orders.map(mapOrderResult);
  const mappedCampaigns = campaigns.map(mapCampaignResult);

  return {
    query,
    customers: mappedCustomers,
    orders: mappedOrders,
    campaigns: mappedCampaigns,
    totalResults: mappedCustomers.length + mappedOrders.length + mappedCampaigns.length,
  };
}

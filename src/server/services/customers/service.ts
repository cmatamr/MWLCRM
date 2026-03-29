import { Prisma } from "@prisma/client";

import {
  createPaginationMeta,
  normalizePagination,
  resolveDb,
  ServiceOptions,
} from "@/server/services/shared";

import { mapCustomerDetail, mapCustomerListItem, mapCustomerMetrics } from "./mappers";
import type { CustomerDetail, CustomersListResponse, ListCustomersParams } from "./types";

function buildCustomerWhere(params: ListCustomersParams): Prisma.ContactWhereInput {
  const search = params.search?.trim();

  return {
    ...(params.status ? { customerStatus: params.status } : {}),
    ...(params.channel ? { primaryChannel: params.channel } : {}),
    ...(search
      ? {
          OR: [
            {
              displayName: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              externalId: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };
}

function buildCustomerOrderBy(
  sort: ListCustomersParams["sort"],
): Prisma.ContactOrderByWithRelationInput {
  switch (sort) {
    case "name":
      return { displayName: "asc" };
    case "recent":
    default:
      return { updatedAt: "desc" };
  }
}

async function getOrderMetricsByContactId(
  contactIds: string[],
  options?: ServiceOptions,
): Promise<Map<string, { totalOrders: number; totalSpentCrc: number; lastOrderAt: Date | null }>> {
  if (contactIds.length === 0) {
    return new Map();
  }

  const db = resolveDb(options);
  const groupedOrders = await db.order.groupBy({
    by: ["contactId"],
    where: {
      contactId: {
        in: contactIds,
      },
    },
    _count: {
      _all: true,
    },
    _sum: {
      totalCrc: true,
    },
    _max: {
      createdAt: true,
    },
  });

  return new Map(
    groupedOrders
      .filter((group): group is typeof group & { contactId: string } => Boolean(group.contactId))
      .map((group) => [
        group.contactId,
        {
          totalOrders: group._count._all,
          totalSpentCrc: group._sum.totalCrc ?? 0,
          lastOrderAt: group._max.createdAt ?? null,
        },
      ]),
  );
}

export async function listCustomers(
  params: ListCustomersParams = {},
  options?: ServiceOptions,
): Promise<CustomersListResponse> {
  const db = resolveDb(options);
  const pagination = normalizePagination(params);
  const where = buildCustomerWhere(params);
  const usesAggregateSort =
    params.sort === "highest_spent" || params.sort === "most_orders";

  const [total, contacts] = await db.$transaction(async (tx) => {
    const totalContacts = await tx.contact.count({ where });
    const records = await tx.contact.findMany({
      where,
      orderBy: buildCustomerOrderBy(params.sort),
      ...(usesAggregateSort
        ? {}
        : {
            skip: pagination.skip,
            take: pagination.take,
          }),
      select: {
        id: true,
        displayName: true,
        externalId: true,
        primaryChannel: true,
        customerStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return [totalContacts, records] as const;
  });

  const orderMetricsByContactId = await getOrderMetricsByContactId(
    contacts.map((contact) => contact.id),
    options,
  );

  const items = contacts
    .map((contact) => ({
      contact,
      metrics: mapCustomerMetrics(orderMetricsByContactId.get(contact.id)),
    }))
    .sort((left, right) => {
      switch (params.sort) {
        case "highest_spent":
          return (
            right.metrics.totalSpentCrc - left.metrics.totalSpentCrc ||
            right.contact.updatedAt.getTime() - left.contact.updatedAt.getTime()
          );
        case "most_orders":
          return (
            right.metrics.totalOrders - left.metrics.totalOrders ||
            right.contact.updatedAt.getTime() - left.contact.updatedAt.getTime()
          );
        case "name":
          return (left.contact.displayName ?? "").localeCompare(right.contact.displayName ?? "", "es");
        case "recent":
        default:
          return right.contact.updatedAt.getTime() - left.contact.updatedAt.getTime();
      }
    })
    .slice(
      usesAggregateSort ? pagination.skip : 0,
      usesAggregateSort ? pagination.skip + pagination.take : undefined,
    )
    .map(({ contact, metrics }) => mapCustomerListItem(contact, metrics));

  return {
    items,
    pagination: createPaginationMeta({
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    }),
  };
}

export async function getCustomerDetail(
  customerId: string,
  options?: ServiceOptions,
): Promise<CustomerDetail | null> {
  const db = resolveDb(options);

  const contact = await db.contact.findUnique({
    where: {
      id: customerId,
    },
    select: {
      id: true,
      displayName: true,
      externalId: true,
      primaryChannel: true,
      customerStatus: true,
      createdAt: true,
      updatedAt: true,
      tags: true,
    },
  });

  if (!contact) {
    return null;
  }

  const [orders, conversations, orderMetricsByContactId] = await Promise.all([
    db.order.findMany({
      where: {
        contactId: customerId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
      select: {
        id: true,
        status: true,
        totalCrc: true,
        createdAt: true,
      },
    }),
    db.leadThread.findMany({
      where: {
        contactId: customerId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 10,
      select: {
        id: true,
        leadThreadKey: true,
        leadStage: true,
        updatedAt: true,
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            text: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    }),
    getOrderMetricsByContactId([customerId], options),
  ]);

  return mapCustomerDetail({
    contact,
    metrics: mapCustomerMetrics(orderMetricsByContactId.get(customerId)),
    orders,
    conversations,
  });
}

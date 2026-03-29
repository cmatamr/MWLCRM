import { Prisma } from "@prisma/client";

import {
  createPaginationMeta,
  isUuid,
  normalizePagination,
  resolveDb,
  ServiceOptions,
} from "@/server/services/shared";

import { mapOrderDetail, mapOrderListItem } from "./mappers";
import type {
  ListOrdersParams,
  OrderDetail,
  OrderFilterOptions,
  OrdersListResponse,
} from "./types";

function buildOrdersWhere(params: ListOrdersParams): Prisma.OrderWhereInput {
  const search = params.search?.trim();
  const searchFilters: Prisma.OrderWhereInput[] = [];

  if (search) {
    if (isUuid(search)) {
      searchFilters.push({
        id: search,
      });
    }

    searchFilters.push(
      {
        contact: {
          is: {
            displayName: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },
      {
        contact: {
          is: {
            externalId: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },
    );
  }

  return {
    ...(params.status ? { status: params.status } : {}),
    ...(params.paymentStatus ? { paymentStatus: params.paymentStatus } : {}),
    ...(searchFilters.length > 0
      ? {
          OR: searchFilters,
        }
      : {}),
  };
}

function buildOrdersOrderBy(
  sort: ListOrdersParams["sort"],
): Prisma.OrderOrderByWithRelationInput {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" };
    case "highest_total":
      return { totalCrc: "desc" };
    case "recent":
    default:
      return { createdAt: "desc" };
  }
}

export async function listOrders(
  params: ListOrdersParams = {},
  options?: ServiceOptions,
): Promise<OrdersListResponse> {
  const db = resolveDb(options);
  const pagination = normalizePagination(params);
  const where = buildOrdersWhere(params);

  const [total, orders] = await db.$transaction([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: buildOrdersOrderBy(params.sort),
      skip: pagination.skip,
      take: pagination.take,
      include: {
        contact: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    }),
  ]);

  return {
    items: orders.map(mapOrderListItem),
    pagination: createPaginationMeta({
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    }),
  };
}

export async function getOrderDetail(
  orderId: string,
  options?: ServiceOptions,
): Promise<OrderDetail | null> {
  const db = resolveDb(options);

  const order = await db.order.findUnique({
    where: {
      id: orderId,
    },
    include: {
      contact: {
        select: {
          id: true,
          displayName: true,
          externalId: true,
        },
      },
      leadThread: {
        select: {
          id: true,
          leadThreadKey: true,
          leadStage: true,
        },
      },
      items: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          productId: true,
          productNameSnapshot: true,
          skuSnapshot: true,
          quantity: true,
          unitPriceCrc: true,
          totalPriceCrc: true,
          theme: true,
          eventDate: true,
          itemNotes: true,
        },
      },
      paymentReceipts: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          status: true,
          bank: true,
          transferType: true,
          amountText: true,
          currency: true,
          reference: true,
          senderName: true,
          recipientName: true,
          destinationPhone: true,
          receiptDate: true,
          createdAt: true,
        },
      },
    },
  });

  return order ? mapOrderDetail(order) : null;
}

export async function getOrderFilterOptions(
  options?: ServiceOptions,
): Promise<OrderFilterOptions> {
  const db = resolveDb(options);

  const paymentStatuses = await db.order.findMany({
    distinct: ["paymentStatus"],
    orderBy: {
      paymentStatus: "asc",
    },
    select: {
      paymentStatus: true,
    },
  });

  return {
    paymentStatuses: paymentStatuses.map((entry) => entry.paymentStatus),
  };
}

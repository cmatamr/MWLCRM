import { OrderStatusEnum, Prisma } from "@prisma/client";

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
  OrderPaymentConfirmationResult,
  OrdersListResponse,
} from "./types";

const PAYMENT_CONFIRMABLE_ORDER_STATUSES: OrderStatusEnum[] = [
  OrderStatusEnum.draft,
  OrderStatusEnum.quoted,
  OrderStatusEnum.pending_payment,
  OrderStatusEnum.payment_review,
  OrderStatusEnum.confirmed,
  OrderStatusEnum.in_design,
];

const PAYMENT_PENDING_STATUSES = [
  "pending",
  "pending_validation",
  "review",
  "payment_review",
] as const;

const PAYMENT_CONFIRMED_STATUS = "validated";

function isPendingPaymentStatus(status: string) {
  return PAYMENT_PENDING_STATUSES.some((candidate) => candidate === status);
}

export class ConfirmOrderPaymentError extends Error {
  code: "ORDER_NOT_FOUND" | "PAYMENT_ALREADY_CONFIRMED" | "INVALID_ORDER_TRANSITION";

  constructor(
    code: ConfirmOrderPaymentError["code"],
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ConfirmOrderPaymentError";
    this.code = code;
  }
}

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

export async function confirmOrderPayment(
  orderId: string,
  options?: ServiceOptions,
): Promise<OrderPaymentConfirmationResult> {
  const db = resolveDb(options);

  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: {
        id: orderId,
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
      },
    });

    if (!order) {
      throw new ConfirmOrderPaymentError("ORDER_NOT_FOUND", "Order not found.", {
        orderId,
      });
    }

    const normalizedPaymentStatus = order.paymentStatus.trim().toLowerCase();

    if (normalizedPaymentStatus === PAYMENT_CONFIRMED_STATUS) {
      throw new ConfirmOrderPaymentError(
        "PAYMENT_ALREADY_CONFIRMED",
        "This order payment is already confirmed.",
        {
          orderId,
          paymentStatus: order.paymentStatus,
          status: order.status,
        },
      );
    }

    if (!isPendingPaymentStatus(normalizedPaymentStatus)) {
      throw new ConfirmOrderPaymentError(
        "INVALID_ORDER_TRANSITION",
        "The current payment status cannot be confirmed from the dashboard.",
        {
          orderId,
          paymentStatus: order.paymentStatus,
          allowedPaymentStatuses: PAYMENT_PENDING_STATUSES,
        },
      );
    }

    if (!PAYMENT_CONFIRMABLE_ORDER_STATUSES.includes(order.status)) {
      throw new ConfirmOrderPaymentError(
        "INVALID_ORDER_TRANSITION",
        "The current order status cannot move to production after payment confirmation.",
        {
          orderId,
          status: order.status,
          allowedOrderStatuses: PAYMENT_CONFIRMABLE_ORDER_STATUSES,
          targetStatus: OrderStatusEnum.in_production,
        },
      );
    }

    const updateResult = await tx.order.updateMany({
      where: {
        id: orderId,
        status: {
          in: PAYMENT_CONFIRMABLE_ORDER_STATUSES,
        },
        paymentStatus: {
          in: [...PAYMENT_PENDING_STATUSES],
        },
      },
      data: {
        paymentStatus: PAYMENT_CONFIRMED_STATUS,
        status: OrderStatusEnum.in_production,
      },
    });

    if (updateResult.count !== 1) {
      const latestOrder = await tx.order.findUnique({
        where: {
          id: orderId,
        },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
        },
      });

      if (!latestOrder) {
        throw new ConfirmOrderPaymentError("ORDER_NOT_FOUND", "Order not found.", {
          orderId,
        });
      }

      if (latestOrder.paymentStatus.trim().toLowerCase() === PAYMENT_CONFIRMED_STATUS) {
        throw new ConfirmOrderPaymentError(
          "PAYMENT_ALREADY_CONFIRMED",
          "This order payment is already confirmed.",
          {
            orderId,
            paymentStatus: latestOrder.paymentStatus,
            status: latestOrder.status,
          },
        );
      }

      throw new ConfirmOrderPaymentError(
        "INVALID_ORDER_TRANSITION",
        "The order could not be updated because its current state no longer allows this transition.",
        {
          orderId,
          paymentStatus: latestOrder.paymentStatus,
          status: latestOrder.status,
        },
      );
    }

    await tx.paymentReceipt.updateMany({
      where: {
        orderId,
        status: {
          in: [...PAYMENT_PENDING_STATUSES],
        },
      },
      data: {
        status: PAYMENT_CONFIRMED_STATUS,
      },
    });

    const updatedOrder = await tx.order.findUniqueOrThrow({
      where: {
        id: orderId,
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        updatedAt: true,
      },
    });

    return {
      id: updatedOrder.id,
      status: updatedOrder.status,
      paymentStatus: updatedOrder.paymentStatus,
      updatedAt: updatedOrder.updatedAt.toISOString(),
    };
  });
}

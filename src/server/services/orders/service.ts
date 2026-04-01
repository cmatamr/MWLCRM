import { OrderStatusEnum, Prisma } from "@prisma/client";

import {
  createPaginationMeta,
  isUuid,
  normalizePagination,
  resolveDb,
  ServiceOptions,
} from "@/server/services/shared";

import { mapOrderDetail, mapOrderItemProductOption, mapOrderListItem } from "./mappers";
import type {
  ListOrdersParams,
  OrderDetail,
  OrderFilterOptions,
  OrderItemProductOption,
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

type OrdersDbClient = Prisma.TransactionClient | ReturnType<typeof resolveDb>;

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

export class UpdateOrderItemQuantityError extends Error {
  code: "ORDER_NOT_FOUND" | "ITEM_NOT_FOUND" | "ITEM_NOT_IN_ORDER";

  constructor(
    code: UpdateOrderItemQuantityError["code"],
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "UpdateOrderItemQuantityError";
    this.code = code;
  }
}

export class UpdateOrderItemEventDateError extends Error {
  code: "ORDER_NOT_FOUND" | "ITEM_NOT_FOUND" | "ITEM_NOT_IN_ORDER";

  constructor(
    code: UpdateOrderItemEventDateError["code"],
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "UpdateOrderItemEventDateError";
    this.code = code;
  }
}

export class DeleteOrderItemError extends Error {
  code: "ORDER_NOT_FOUND" | "ITEM_NOT_FOUND" | "ITEM_NOT_IN_ORDER" | "LAST_ITEM_BLOCKED";

  constructor(
    code: DeleteOrderItemError["code"],
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DeleteOrderItemError";
    this.code = code;
  }
}

export class CreateOrderItemError extends Error {
  code:
    | "ORDER_NOT_FOUND"
    | "PRODUCT_NOT_FOUND"
    | "PRODUCT_ALREADY_IN_ORDER";

  constructor(
    code: CreateOrderItemError["code"],
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "CreateOrderItemError";
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
  const order = await findOrderDetailRecord(db, orderId);

  return order ? mapOrderDetail(order) : null;
}

async function findOrderDetailRecord(db: OrdersDbClient, orderId: string) {
  return db.order.findUnique({
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
}

async function recalculateOrderTotals(
  tx: Prisma.TransactionClient,
  input: {
    orderId: string;
    previousSubtotalCrc: number;
    previousTotalCrc: number;
  },
) {
  const orderItems = await tx.orderItem.findMany({
    where: {
      orderId: input.orderId,
    },
    select: {
      totalPriceCrc: true,
    },
  });

  const subtotalCrc = orderItems.reduce((sum, orderItem) => sum + (orderItem.totalPriceCrc ?? 0), 0);
  const netAdjustment = input.previousSubtotalCrc - input.previousTotalCrc;
  const totalCrc = Math.max(0, subtotalCrc - netAdjustment);

  await tx.order.update({
    where: {
      id: input.orderId,
    },
    data: {
      subtotalCrc,
      totalCrc,
    },
  });
}

export async function listOrderItemProductOptions(
  input: {
    orderId: string;
    query?: string;
  },
  options?: ServiceOptions,
): Promise<OrderItemProductOption[]> {
  const db = resolveDb(options);
  const normalizedQuery = input.query?.trim();

  const order = await db.order.findUnique({
    where: {
      id: input.orderId,
    },
    select: {
      id: true,
    },
  });

  if (!order) {
    throw new CreateOrderItemError("ORDER_NOT_FOUND", "Order not found.", {
      orderId: input.orderId,
    });
  }

  const products = await db.mwlProduct.findMany({
    where: {
      isActive: true,
      isAgentVisible: true,
      ...(normalizedQuery
        ? {
            OR: [
              {
                name: {
                  contains: normalizedQuery,
                  mode: "insensitive",
                },
              },
              {
                sku: {
                  contains: normalizedQuery,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
      orderItems: {
        none: {
          orderId: input.orderId,
        },
      },
    },
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        name: "asc",
      },
    ],
    take: 25,
    select: {
      id: true,
      name: true,
      sku: true,
      priceCrc: true,
      priceFromCrc: true,
      category: true,
      family: true,
    },
  });

  return products.map(mapOrderItemProductOption);
}

export async function createOrderItem(
  input: {
    orderId: string;
    productId: string;
    quantity: number;
  },
  options?: ServiceOptions,
): Promise<OrderDetail> {
  const db = resolveDb(options);

  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: {
        id: input.orderId,
      },
      select: {
        id: true,
        subtotalCrc: true,
        totalCrc: true,
      },
    });

    if (!order) {
      throw new CreateOrderItemError("ORDER_NOT_FOUND", "Order not found.", {
        orderId: input.orderId,
      });
    }

    const product = await tx.mwlProduct.findUnique({
      where: {
        id: input.productId,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        priceCrc: true,
        priceFromCrc: true,
      },
    });

    if (!product) {
      throw new CreateOrderItemError("PRODUCT_NOT_FOUND", "Producto no encontrado.", {
        orderId: input.orderId,
        productId: input.productId,
      });
    }

    const existingItem = await tx.orderItem.findFirst({
      where: {
        orderId: input.orderId,
        productId: input.productId,
      },
      select: {
        id: true,
      },
    });

    if (existingItem) {
      throw new CreateOrderItemError(
        "PRODUCT_ALREADY_IN_ORDER",
        "Este producto ya existe dentro de la orden.",
        {
          orderId: input.orderId,
          productId: input.productId,
          itemId: existingItem.id.toString(),
        },
      );
    }

    const unitPriceCrc = product.priceCrc ?? product.priceFromCrc ?? null;

    await tx.orderItem.create({
      data: {
        orderId: input.orderId,
        productId: product.id,
        quantity: input.quantity,
        unitPriceCrc,
        totalPriceCrc: unitPriceCrc != null ? unitPriceCrc * input.quantity : null,
        productNameSnapshot: product.name,
        skuSnapshot: product.sku,
      },
    });

    await recalculateOrderTotals(tx, {
      orderId: input.orderId,
      previousSubtotalCrc: order.subtotalCrc,
      previousTotalCrc: order.totalCrc,
    });

    const updatedOrder = await findOrderDetailRecord(tx, input.orderId);

    if (!updatedOrder) {
      throw new CreateOrderItemError("ORDER_NOT_FOUND", "Order not found.", {
        orderId: input.orderId,
      });
    }

    return mapOrderDetail(updatedOrder);
  });
}

export async function updateOrderItemQuantity(
  input: {
    orderId: string;
    itemId: bigint;
    quantity: number;
  },
  options?: ServiceOptions,
): Promise<OrderDetail> {
  const db = resolveDb(options);

  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: {
        id: input.orderId,
      },
      select: {
        id: true,
        subtotalCrc: true,
        totalCrc: true,
      },
    });

    if (!order) {
      throw new UpdateOrderItemQuantityError("ORDER_NOT_FOUND", "Order not found.", {
        orderId: input.orderId,
      });
    }

    const item = await tx.orderItem.findUnique({
      where: {
        id: input.itemId,
      },
      select: {
        id: true,
        orderId: true,
        unitPriceCrc: true,
      },
    });

    if (!item) {
      throw new UpdateOrderItemQuantityError("ITEM_NOT_FOUND", "Order item not found.", {
        orderId: input.orderId,
        itemId: input.itemId.toString(),
      });
    }

    if (item.orderId !== input.orderId) {
      throw new UpdateOrderItemQuantityError(
        "ITEM_NOT_IN_ORDER",
        "Order item does not belong to the requested order.",
        {
          orderId: input.orderId,
          itemId: input.itemId.toString(),
          itemOrderId: item.orderId,
        },
      );
    }

    const netAdjustment = order.subtotalCrc - order.totalCrc;
    const nextLineTotal = item.unitPriceCrc != null ? item.unitPriceCrc * input.quantity : null;

    await tx.orderItem.update({
      where: {
        id: item.id,
      },
      data: {
        quantity: input.quantity,
        totalPriceCrc: nextLineTotal,
      },
    });

    await recalculateOrderTotals(tx, {
      orderId: input.orderId,
      previousSubtotalCrc: order.subtotalCrc,
      previousTotalCrc: order.totalCrc,
    });

    const updatedOrder = await findOrderDetailRecord(tx, input.orderId);

    if (!updatedOrder) {
      throw new UpdateOrderItemQuantityError("ORDER_NOT_FOUND", "Order not found.", {
        orderId: input.orderId,
      });
    }

    return mapOrderDetail(updatedOrder);
  });
}

export async function deleteOrderItem(
  input: {
    orderId: string;
    itemId: bigint;
  },
  options?: ServiceOptions,
): Promise<OrderDetail> {
  const db = resolveDb(options);

  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: {
        id: input.orderId,
      },
      select: {
        id: true,
        subtotalCrc: true,
        totalCrc: true,
      },
    });

    if (!order) {
      throw new DeleteOrderItemError("ORDER_NOT_FOUND", "Order not found.", {
        orderId: input.orderId,
      });
    }

    const item = await tx.orderItem.findUnique({
      where: {
        id: input.itemId,
      },
      select: {
        id: true,
        orderId: true,
      },
    });

    if (!item) {
      throw new DeleteOrderItemError("ITEM_NOT_FOUND", "Order item not found.", {
        orderId: input.orderId,
        itemId: input.itemId.toString(),
      });
    }

    if (item.orderId !== input.orderId) {
      throw new DeleteOrderItemError(
        "ITEM_NOT_IN_ORDER",
        "Order item does not belong to the requested order.",
        {
          orderId: input.orderId,
          itemId: input.itemId.toString(),
          itemOrderId: item.orderId,
        },
      );
    }

    const itemCount = await tx.orderItem.count({
      where: {
        orderId: input.orderId,
      },
    });

    if (itemCount <= 1) {
      throw new DeleteOrderItemError(
        "LAST_ITEM_BLOCKED",
        "No se puede eliminar el ultimo item de la orden.",
        {
          orderId: input.orderId,
          itemId: input.itemId.toString(),
          itemCount,
        },
      );
    }

    await tx.orderItem.delete({
      where: {
        id: input.itemId,
      },
    });

    await recalculateOrderTotals(tx, {
      orderId: input.orderId,
      previousSubtotalCrc: order.subtotalCrc,
      previousTotalCrc: order.totalCrc,
    });

    const updatedOrder = await findOrderDetailRecord(tx, input.orderId);

    if (!updatedOrder) {
      throw new DeleteOrderItemError("ORDER_NOT_FOUND", "Order not found.", {
        orderId: input.orderId,
      });
    }

    return mapOrderDetail(updatedOrder);
  });
}

export async function updateOrderItemEventDate(
  input: {
    orderId: string;
    itemId: bigint;
    eventDate: string | null;
  },
  options?: ServiceOptions,
): Promise<OrderDetail> {
  const db = resolveDb(options);

  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: {
        id: input.orderId,
      },
      select: {
        id: true,
      },
    });

    if (!order) {
      throw new UpdateOrderItemEventDateError("ORDER_NOT_FOUND", "Order not found.", {
        orderId: input.orderId,
      });
    }

    const item = await tx.orderItem.findUnique({
      where: {
        id: input.itemId,
      },
      select: {
        id: true,
        orderId: true,
      },
    });

    if (!item) {
      throw new UpdateOrderItemEventDateError("ITEM_NOT_FOUND", "Order item not found.", {
        orderId: input.orderId,
        itemId: input.itemId.toString(),
      });
    }

    if (item.orderId !== input.orderId) {
      throw new UpdateOrderItemEventDateError(
        "ITEM_NOT_IN_ORDER",
        "Order item does not belong to the requested order.",
        {
          orderId: input.orderId,
          itemId: input.itemId.toString(),
          itemOrderId: item.orderId,
        },
      );
    }

    await tx.orderItem.update({
      where: {
        id: item.id,
      },
      data: {
        eventDate: input.eventDate ? new Date(`${input.eventDate}T00:00:00.000Z`) : null,
      },
    });

    const updatedOrder = await findOrderDetailRecord(tx, input.orderId);

    if (!updatedOrder) {
      throw new UpdateOrderItemEventDateError("ORDER_NOT_FOUND", "Order not found.", {
        orderId: input.orderId,
      });
    }

    return mapOrderDetail(updatedOrder);
  });
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

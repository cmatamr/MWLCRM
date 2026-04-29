import {
  OrderStatusEnum,
  PaymentReceiptSourceEnum,
  PaymentReceiptStatusEnum,
  Prisma,
} from "@prisma/client";

import {
  calculateOrderItemSubtotalCrc,
  calculateOrderItemsSubtotalCrc,
  orderStatusesRequiringValidatedReceipt,
} from "@/domain/crm/orders";
import { formatCalendarDate, formatCurrencyCRC } from "@/domain/crm/formatters";
import { logError, logWarn } from "@/server/observability/logger";
import {
  createPaginationMeta,
  isUuid,
  normalizePagination,
  resolveDb,
  ServiceOptions,
} from "@/server/services/shared";
import { resolveProductPricing } from "@/server/services/products";
import type { ProductPricingResolution } from "@/server/services/products";

import { mapOrderDetail, mapOrderItemProductOption, mapOrderListItem } from "./mappers";
import type {
  CreateOrderActivityInput,
  CreateOrderInput,
  ListOrdersParams,
  OrderDetail,
  OrderFilterOptions,
  OrderItemProductOption,
  OrdersListResponse,
  UpdateOrderInput,
  UpdateOrderActivityInput,
} from "./types";

const ORDER_STATUSES_ALLOWED_TO_ENTER_PRODUCTION: OrderStatusEnum[] = [
  OrderStatusEnum.draft,
  OrderStatusEnum.quoted,
  OrderStatusEnum.pending_payment,
  OrderStatusEnum.payment_review,
  OrderStatusEnum.confirmed,
  OrderStatusEnum.in_design,
];

const MANUAL_ORDER_SOURCE = "CRM";
const MANUAL_ORDER_INITIAL_STATUS = OrderStatusEnum.pending_payment;
const MANUAL_ORDER_INITIAL_PAYMENT_STATUS = "pending_validation";
const ORDER_ACTIVITY_TYPE_NOTE = "note";
const ORDER_ACTIVITY_TYPE_PAYMENT_VALIDATION = "payment_validation";
const ORDER_ACTIVITY_TYPE_SYSTEM_EVENT = "system_event";
const ORDER_PAYMENT_STATUS_PENDING_VALIDATION = "pending_validation";
const ORDER_PAYMENT_STATUS_VALIDATED = "validated";
const DEFAULT_RECEIPT_CURRENCY = "CRC";

type OrdersDbClient = Prisma.TransactionClient | ReturnType<typeof resolveDb>;
type OrderItemCatalogProduct = {
  id: string;
  name: string;
  sku: string;
  priceCrc: number | null;
  priceFromCrc: number | null;
  pricingMode: string;
  minQty: number | null;
  category: string;
  family: string;
};

function resolvePrismaErrorMetadata(error: unknown): {
  prismaCode: string | null;
  prismaClientVersion: string | null;
} {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return {
      prismaCode: error.code,
      prismaClientVersion: error.clientVersion ?? null,
    };
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return {
      prismaCode: null,
      prismaClientVersion: error.clientVersion ?? null,
    };
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      prismaCode: error.errorCode ?? null,
      prismaClientVersion: error.clientVersion ?? null,
    };
  }

  return {
    prismaCode: null,
    prismaClientVersion: null,
  };
}

export class PaymentReceiptError extends Error {
  code:
    | "ORDER_NOT_FOUND"
    | "BANK_NOT_FOUND"
    | "RECEIPT_NOT_FOUND"
    | "RECEIPT_NOT_IN_ORDER"
    | "RECEIPT_ALREADY_VALIDATED"
    | "RECEIPT_SOFT_DELETED"
    | "RECEIPT_AMOUNT_REQUIRED"
    | "INVALID_RECEIPT_TRANSITION"
    | "DUPLICATE_RECEIPT_KEY";

  constructor(
    code: PaymentReceiptError["code"],
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "PaymentReceiptError";
    this.code = code;
  }
}

export class CreateOrderError extends Error {
  code:
    | "CUSTOMER_NOT_FOUND"
    | "CUSTOMER_WITHOUT_CONVERSATION"
    | "PRODUCT_NOT_FOUND"
    | "DUPLICATE_PRODUCT"
    | "PRICING_MANUAL_REQUIRED"
    | "PRICING_MIN_QTY_NOT_MET"
    | "PRICING_CONFIGURATION_INVALID"
    | "PRICING_NON_LINEAR_UNSUPPORTED";

  constructor(
    code: CreateOrderError["code"],
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "CreateOrderError";
    this.code = code;
  }
}

export class UpdateOrderItemQuantityError extends Error {
  code:
    | "ORDER_NOT_FOUND"
    | "ITEM_NOT_FOUND"
    | "ITEM_NOT_IN_ORDER"
    | "PRICING_MANUAL_REQUIRED"
    | "PRICING_MIN_QTY_NOT_MET"
    | "PRICING_CONFIGURATION_INVALID"
    | "PRICING_NON_LINEAR_UNSUPPORTED";

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

export class UpdateOrderItemDeliveryDateError extends Error {
  code: "ORDER_NOT_FOUND" | "ITEM_NOT_FOUND" | "ITEM_NOT_IN_ORDER";

  constructor(
    code: UpdateOrderItemDeliveryDateError["code"],
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "UpdateOrderItemDeliveryDateError";
    this.code = code;
  }
}

export class UpdateOrderDeliveryDateError extends Error {
  code: "ORDER_NOT_FOUND";

  constructor(
    code: UpdateOrderDeliveryDateError["code"],
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "UpdateOrderDeliveryDateError";
    this.code = code;
  }
}

export class UpdateOrderError extends Error {
  code: "ORDER_NOT_FOUND" | "STATUS_REQUIRES_VALID_RECEIPT";

  constructor(
    code: UpdateOrderError["code"],
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "UpdateOrderError";
    this.code = code;
  }
}

const ORDER_STATUSES_REQUIRING_VALIDATED_RECEIPT = new Set<OrderStatusEnum>(
  orderStatusesRequiringValidatedReceipt,
);

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
    | "PRODUCT_ALREADY_IN_ORDER"
    | "PRICING_MANUAL_REQUIRED"
    | "PRICING_MIN_QTY_NOT_MET"
    | "PRICING_CONFIGURATION_INVALID"
    | "PRICING_NON_LINEAR_UNSUPPORTED";

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

export class DeleteOrderError extends Error {
  code: "ORDER_NOT_FOUND";

  constructor(
    code: DeleteOrderError["code"],
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DeleteOrderError";
    this.code = code;
  }
}

export class CreateOrderActivityError extends Error {
  code: "ORDER_NOT_FOUND";

  constructor(
    code: CreateOrderActivityError["code"],
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "CreateOrderActivityError";
    this.code = code;
  }
}

export class DeleteOrderActivityError extends Error {
  code: "ORDER_NOT_FOUND" | "ACTIVITY_NOT_FOUND" | "ACTIVITY_NOT_IN_ORDER";

  constructor(
    code: DeleteOrderActivityError["code"],
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DeleteOrderActivityError";
    this.code = code;
  }
}

export class UpdateOrderActivityError extends Error {
  code: "ORDER_NOT_FOUND" | "ACTIVITY_NOT_FOUND" | "ACTIVITY_NOT_IN_ORDER";

  constructor(
    code: UpdateOrderActivityError["code"],
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "UpdateOrderActivityError";
    this.code = code;
  }
}

type PaymentReceiptMutationInput = {
  orderId: string;
  receiptId: string;
  performedBy?: string | null;
  internalNotes?: string | null;
};

type CreatePaymentReceiptInput = {
  orderId: string;
  messageId?: string | null;
  receiptKey?: string | null;
  amountCrc: number;
  amountText?: string | null;
  currency?: string | null;
  bankId?: string | null;
  bank?: string | null;
  transferType?: string | null;
  reference?: string | null;
  senderName?: string | null;
  recipientName?: string | null;
  destinationPhone?: string | null;
  receiptDate?: string | null;
  receiptTime?: string | null;
  internalNotes?: string | null;
  rawPayload?: Prisma.InputJsonValue;
};

type UpdatePaymentReceiptInput = {
  orderId: string;
  receiptId: string;
  amountCrc?: number;
  amountText?: string | null;
  currency?: string | null;
  bankId?: string | null;
  bank?: string | null;
  transferType?: string | null;
  reference?: string | null;
  senderName?: string | null;
  recipientName?: string | null;
  destinationPhone?: string | null;
  receiptDate?: string | null;
  receiptTime?: string | null;
  internalNotes?: string | null;
};

function normalizeOptionalText(value: string | null | undefined) {
  if (value == null) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function formatOrderStatusForValidationMessage(status: OrderStatusEnum) {
  return status
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

async function resolveBankReference(
  tx: Prisma.TransactionClient,
  input: { bankId?: string | null; bank?: string | null },
) {
  const normalizedBankId = normalizeOptionalText(input.bankId);

  if (!normalizedBankId) {
    return {
      bankId: null,
      bankName: normalizeOptionalText(input.bank),
    };
  }

  const bank = await tx.bank.findUnique({
    where: {
      id: normalizedBankId,
    },
    select: {
      id: true,
      name: true,
      isActive: true,
    },
  });

  if (!bank || !bank.isActive) {
    throw new PaymentReceiptError(
      "BANK_NOT_FOUND",
      "Selected bank was not found or is inactive.",
      {
        bankId: normalizedBankId,
      },
    );
  }

  return {
    bankId: bank.id,
    bankName: bank.name,
  };
}

function buildManualReceiptKey(orderId: string) {
  return `manual_crm:${orderId}:${crypto.randomUUID()}`;
}

function normalizeReceiptDateInput(value: string | null | undefined) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function buildValidatedReceiptSummary(input: {
  receiptId: string;
  amountCrc: number | null;
  bank: string | null;
  transferType: string | null;
  reference: string | null;
  receiptDate: Date | null;
  receiptTime: string | null;
  senderName: string | null;
  destinationPhone: string | null;
  recipientName: string | null;
}) {
  const amount =
    input.amountCrc != null ? formatCurrencyCRC(input.amountCrc) : "Sin monto detectado";
  const dateAndTime = `${input.receiptDate ? formatCalendarDate(input.receiptDate) : "Sin fecha"}${
    input.receiptTime ? ` · ${input.receiptTime}` : ""
  }`;
  const destination = input.destinationPhone ?? input.recipientName ?? "No detectado";

  return [
    `Comprobante #${input.receiptId.slice(0, 8)}`,
    `Monto: ${amount}`,
    `Banco / Tipo: ${input.bank ?? "Banco no detectado"} · ${input.transferType ?? "Tipo no detectado"}`,
    `Referencia: ${input.reference ?? "Sin referencia"}`,
    `Fecha / Hora: ${dateAndTime}`,
    `Remitente: ${input.senderName ?? "No detectado"}`,
    `Destino: ${destination}`,
  ].join("\n");
}

async function appendValidatedReceiptSystemMessageTx(
  tx: Prisma.TransactionClient,
  input: {
    leadThreadId: string;
    performedBy: string | null;
    receiptId: string;
    amountCrc: number | null;
    bank: string | null;
    transferType: string | null;
    reference: string | null;
    receiptDate: Date | null;
    receiptTime: string | null;
    senderName: string | null;
    destinationPhone: string | null;
    recipientName: string | null;
  },
) {
  const actor = normalizeOptionalText(input.performedBy) ?? "CRM";
  const summary = buildValidatedReceiptSummary(input);
  const text = `Comprobante aprobado por ${actor}.\n\n${summary}`;

  await tx.$executeRaw`
    with provider_choice as (
      select
        case
          when exists (
            select 1
            from pg_type t
            join pg_enum e
              on e.enumtypid = t.oid
            where t.typnamespace = 'public'::regnamespace
              and t.typname = 'provider_type'
              and e.enumlabel = 'CRM'
          ) then 'CRM'
          when exists (
            select 1
            from pg_type t
            join pg_enum e
              on e.enumtypid = t.oid
            where t.typnamespace = 'public'::regnamespace
              and t.typname = 'provider_type'
              and e.enumlabel = 'crm'
          ) then 'crm'
          else 'ycloud'
        end as provider_value
    )
    insert into public.messages (
      lead_thread_id,
      sender_type,
      text,
      attachments,
      provider,
      received_ts,
      created_at
    )
    values (
      ${input.leadThreadId}::uuid,
      'system'::public.sender_type,
      ${text}::text,
      '[]'::jsonb,
      (select provider_value::public.provider_type from provider_choice),
      now(),
      now()
    );
  `;
}

async function appendOrderActivityForReceiptEvent(
  tx: Prisma.TransactionClient,
  input: {
    orderId: string;
    receiptId: string;
    activityType?: string;
    createdBy?: string | null;
    content: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  await tx.orderActivity.create({
    data: {
      orderId: input.orderId,
      type: input.activityType ?? ORDER_ACTIVITY_TYPE_PAYMENT_VALIDATION,
      content: input.content,
      createdBy: normalizeOptionalText(input.createdBy),
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    },
  });
}

async function getScopedReceiptOrThrow(
  tx: Prisma.TransactionClient,
  input: {
    orderId: string;
    receiptId: string;
  },
) {
  const receipt = await tx.paymentReceipt.findUnique({
    where: {
      id: input.receiptId,
    },
    select: {
      id: true,
      orderId: true,
      receiptKey: true,
      status: true,
      amountCrc: true,
      bank: true,
      transferType: true,
      reference: true,
      receiptDate: true,
      receiptTime: true,
      senderName: true,
      recipientName: true,
      destinationPhone: true,
      deletedAt: true,
    },
  });

  if (!receipt) {
    throw new PaymentReceiptError("RECEIPT_NOT_FOUND", "Payment receipt not found.", {
      orderId: input.orderId,
      receiptId: input.receiptId,
    });
  }

  if (receipt.orderId !== input.orderId) {
    throw new PaymentReceiptError(
      "RECEIPT_NOT_IN_ORDER",
      "Payment receipt does not belong to the requested order.",
      {
        orderId: input.orderId,
        receiptId: input.receiptId,
        receiptOrderId: receipt.orderId,
      },
    );
  }

  return receipt;
}

async function ensureOrderExists(
  tx: Prisma.TransactionClient,
  orderId: string,
) {
  const order = await tx.order.findUnique({
    where: {
      id: orderId,
    },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      leadThreadId: true,
    },
  });

  if (!order) {
    throw new PaymentReceiptError("ORDER_NOT_FOUND", "Order not found.", {
      orderId,
    });
  }

  return order;
}

async function transitionLeadToWonForValidatedReceiptTx(
  tx: Prisma.TransactionClient,
  input: {
    leadThreadId: string;
    orderId: string;
    receiptId: string;
    performedBy?: string | null;
  },
) {
  const changedBy = normalizeOptionalText(input.performedBy) ?? "crm:payment_receipt_validation";
  const reason = "Payment receipt validated and order moved to in_production from CRM.";
  const evidenceExcerpt = `order_id=${input.orderId}; receipt_id=${input.receiptId}; action=validate_receipt`;
  const evidenceJson = JSON.stringify({
    order_id: input.orderId,
    receipt_id: input.receiptId,
    action: "validate_receipt",
    source: "crm",
  });

  await tx.$executeRaw`
    select public.apply_funnel_stage_transition(
      ${input.leadThreadId}::uuid,
      'won'::public.lead_stage_type,
      'human'::public.funnel_stage_source_enum,
      ${1}::numeric,
      ${reason}::text,
      ${changedBy}::text,
      null::uuid,
      null::uuid,
      ${evidenceExcerpt}::text,
      ${evidenceJson}::jsonb
    );
  `;
}

export async function recomputeOrderPaymentState(
  orderId: string,
  options?: ServiceOptions,
): Promise<void> {
  const db = resolveDb(options);

  await db.$transaction(async (tx) => {
    await recomputeOrderPaymentStateTx(tx, orderId);
  });
}

async function recomputeOrderPaymentStateTx(
  tx: Prisma.TransactionClient,
  orderId: string,
) {
  const order = await ensureOrderExists(tx, orderId);

  const [validatedCount, pendingCount] = await Promise.all([
    tx.paymentReceipt.count({
      where: {
        orderId,
        status: PaymentReceiptStatusEnum.validated,
        deletedAt: null,
      },
    }),
    tx.paymentReceipt.count({
      where: {
        orderId,
        status: PaymentReceiptStatusEnum.pending_validation,
        deletedAt: null,
      },
    }),
  ]);

  const nextPaymentStatus =
    validatedCount > 0 ? ORDER_PAYMENT_STATUS_VALIDATED : ORDER_PAYMENT_STATUS_PENDING_VALIDATION;

  const nextStatus =
    validatedCount > 0 &&
    ORDER_STATUSES_ALLOWED_TO_ENTER_PRODUCTION.includes(order.status)
      ? OrderStatusEnum.in_production
      : order.status;

  if (order.paymentStatus !== nextPaymentStatus || order.status !== nextStatus) {
    await tx.order.update({
      where: {
        id: orderId,
      },
      data: {
        paymentStatus: nextPaymentStatus,
        status: nextStatus,
      },
    });
  } else if (validatedCount === 0 && pendingCount === 0 && order.paymentStatus !== ORDER_PAYMENT_STATUS_PENDING_VALIDATION) {
    await tx.order.update({
      where: {
        id: orderId,
      },
      data: {
        paymentStatus: ORDER_PAYMENT_STATUS_PENDING_VALIDATION,
      },
    });
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
      activityEntries: {
        where: {
          type: ORDER_ACTIVITY_TYPE_NOTE,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          type: true,
          content: true,
          metadata: true,
          createdAt: true,
          createdBy: true,
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
          deliveryDate: true,
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
          amountCrc: true,
          bankId: true,
          bank: true,
          transferType: true,
          amountText: true,
          currency: true,
          reference: true,
          senderName: true,
          recipientName: true,
          destinationPhone: true,
          receiptDate: true,
          receiptTime: true,
          internalNotes: true,
          createdAt: true,
          bankRef: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
}

function buildOrderItemCreateData(input: {
  orderId: string;
  product: OrderItemCatalogProduct;
  quantity: number;
  unitPriceCrc: number | null;
}): Prisma.OrderItemUncheckedCreateInput {
  return {
    orderId: input.orderId,
    productId: input.product.id,
    quantity: input.quantity,
    unitPriceCrc: input.unitPriceCrc,
    totalPriceCrc: calculateOrderItemSubtotalCrc({
      quantity: input.quantity,
      unitPriceCrc: input.unitPriceCrc,
    }),
    productNameSnapshot: input.product.name,
    skuSnapshot: input.product.sku,
  };
}

async function getCatalogProductsByIds(
  db: OrdersDbClient,
  productIds: string[],
): Promise<Map<string, OrderItemCatalogProduct>> {
  const products = await db.mwlProduct.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
    select: {
      id: true,
      name: true,
      sku: true,
      priceCrc: true,
      priceFromCrc: true,
      pricingMode: true,
      minQty: true,
      category: true,
      family: true,
    },
  });

  return new Map(products.map((product) => [product.id, product]));
}

function toOrderOptionPricingPayload(input: ProductPricingResolution): {
  unitPriceCrc: number | null;
  pricingStatus: OrderItemProductOption["pricingStatus"];
  pricingMode: OrderItemProductOption["pricingMode"];
  quotedQty: number | null;
  suggestedQty: number | null;
  minQty: number | null;
  totalCrc: number | null;
  pricingMessage: string;
  requiresManualReview: boolean;
} {
  return {
    unitPriceCrc: input.unit_price_crc,
    pricingStatus: input.status,
    pricingMode: input.mode,
    quotedQty: input.quoted_qty,
    suggestedQty: input.suggested_qty,
    minQty: input.min_qty,
    totalCrc: input.total_crc,
    pricingMessage: input.message,
    requiresManualReview:
      input.status !== "quotable" ||
      input.unit_price_crc == null ||
      input.total_crc == null,
  };
}

function pricingStatusToCreateOrderErrorCode(
  status: ProductPricingResolution["status"],
): CreateOrderError["code"] {
  if (status === "manual_required") {
    return "PRICING_MANUAL_REQUIRED";
  }

  if (status === "min_qty_not_met") {
    return "PRICING_MIN_QTY_NOT_MET";
  }

  return "PRICING_CONFIGURATION_INVALID";
}

function pricingStatusToCreateOrderItemErrorCode(
  status: ProductPricingResolution["status"],
): CreateOrderItemError["code"] {
  if (status === "manual_required") {
    return "PRICING_MANUAL_REQUIRED";
  }

  if (status === "min_qty_not_met") {
    return "PRICING_MIN_QTY_NOT_MET";
  }

  return "PRICING_CONFIGURATION_INVALID";
}

function pricingStatusToUpdateQtyErrorCode(
  status: ProductPricingResolution["status"],
): UpdateOrderItemQuantityError["code"] {
  if (status === "manual_required") {
    return "PRICING_MANUAL_REQUIRED";
  }

  if (status === "min_qty_not_met") {
    return "PRICING_MIN_QTY_NOT_MET";
  }

  return "PRICING_CONFIGURATION_INVALID";
}

function requireLinearUnitPriceForOrder(
  resolution: ProductPricingResolution,
  context: {
    source: "create_order" | "create_order_item" | "update_order_item_quantity";
    orderId?: string;
    productId: string;
    itemId?: string;
    quantity: number;
  },
): number {
  if (resolution.status !== "quotable") {
    if (context.source === "create_order") {
      throw new CreateOrderError(
        pricingStatusToCreateOrderErrorCode(resolution.status),
        resolution.message,
        {
          orderId: context.orderId ?? null,
          productId: context.productId,
          quantity: context.quantity,
          pricing: resolution,
        },
      );
    }

    if (context.source === "create_order_item") {
      throw new CreateOrderItemError(
        pricingStatusToCreateOrderItemErrorCode(resolution.status),
        resolution.message,
        {
          orderId: context.orderId ?? null,
          productId: context.productId,
          quantity: context.quantity,
          pricing: resolution,
        },
      );
    }

    throw new UpdateOrderItemQuantityError(
      pricingStatusToUpdateQtyErrorCode(resolution.status),
      resolution.message,
      {
        orderId: context.orderId ?? null,
        productId: context.productId,
        itemId: context.itemId ?? null,
        quantity: context.quantity,
        pricing: resolution,
      },
    );
  }

  if (resolution.unit_price_crc == null) {
    const message =
      "La cotizacion actual no incluye precio unitario lineal y requiere revision manual.";

    if (context.source === "create_order") {
      throw new CreateOrderError("PRICING_NON_LINEAR_UNSUPPORTED", message, {
        orderId: context.orderId ?? null,
        productId: context.productId,
        quantity: context.quantity,
        pricing: resolution,
      });
    }

    if (context.source === "create_order_item") {
      throw new CreateOrderItemError("PRICING_NON_LINEAR_UNSUPPORTED", message, {
        orderId: context.orderId ?? null,
        productId: context.productId,
        quantity: context.quantity,
        pricing: resolution,
      });
    }

    throw new UpdateOrderItemQuantityError("PRICING_NON_LINEAR_UNSUPPORTED", message, {
      orderId: context.orderId ?? null,
      productId: context.productId,
      itemId: context.itemId ?? null,
      quantity: context.quantity,
      pricing: resolution,
    });
  }

  return resolution.unit_price_crc;
}

function findDuplicateProductId(items: CreateOrderInput["items"]) {
  const seen = new Set<string>();

  for (const item of items) {
    if (seen.has(item.productId)) {
      return item.productId;
    }

    seen.add(item.productId);
  }

  return null;
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

  const subtotalCrc = calculateOrderItemsSubtotalCrc(orderItems);
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

async function listAvailableOrderItemProducts(
  input: {
    query?: string;
    qty?: number;
    exactProductId?: string;
    excludeOrderId?: string;
  },
  options?: ServiceOptions,
): Promise<OrderItemProductOption[]> {
  const db = resolveDb(options);
  const normalizedQuery = input.query?.trim();
  const normalizedExactProductId = input.exactProductId?.trim() || undefined;
  const normalizedQty =
    input.qty != null && Number.isInteger(input.qty) && input.qty > 0 ? input.qty : 1;

  if (input.excludeOrderId) {
    const order = await db.order.findUnique({
      where: {
        id: input.excludeOrderId,
      },
      select: {
        id: true,
      },
    });

    if (!order) {
      throw new CreateOrderItemError("ORDER_NOT_FOUND", "Order not found.", {
        orderId: input.excludeOrderId,
      });
    }
  }

  const products = await db.mwlProduct.findMany({
    where: {
      isActive: true,
      isAgentVisible: true,
      ...(normalizedExactProductId
        ? {
            id: normalizedExactProductId,
          }
        : {}),
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
      ...(input.excludeOrderId
        ? {
            orderItems: {
              none: {
                orderId: input.excludeOrderId,
              },
            },
          }
        : {}),
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
      pricingMode: true,
      minQty: true,
      category: true,
      family: true,
    },
  });

  const resolvedPricing = await Promise.all(
    products.map(async (product) => {
      const pricing = await resolveProductPricing(
        { productId: product.id, qty: normalizedQty },
        options,
      );

      return mapOrderItemProductOption({
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        family: product.family,
        ...toOrderOptionPricingPayload(pricing),
      });
    }),
  );

  return resolvedPricing;
}

export async function listOrderItemProductOptions(
  input: {
    orderId: string;
    query?: string;
    qty?: number;
    exactProductId?: string;
  },
  options?: ServiceOptions,
): Promise<OrderItemProductOption[]> {
  return listAvailableOrderItemProducts(
    {
      query: input.query,
      qty: input.qty,
      exactProductId: input.exactProductId,
      excludeOrderId: input.orderId,
    },
    options,
  );
}

export async function listOrderCatalogProductOptions(
  input: {
    query?: string;
    qty?: number;
    exactProductId?: string;
  },
  options?: ServiceOptions,
): Promise<OrderItemProductOption[]> {
  return listAvailableOrderItemProducts(input, options);
}

export async function createOrder(
  input: CreateOrderInput,
  options?: ServiceOptions,
): Promise<OrderDetail> {
  const db = resolveDb(options);

  return db.$transaction(async (tx) => {
    const duplicateProductId = findDuplicateProductId(input.items);

    if (duplicateProductId) {
      throw new CreateOrderError(
        "DUPLICATE_PRODUCT",
        "No se puede agregar el mismo producto mas de una vez en la misma orden.",
        {
          productId: duplicateProductId,
        },
      );
    }

    const customer = await tx.contact.findUnique({
      where: {
        id: input.customerId,
      },
      select: {
        id: true,
      },
    });

    if (!customer) {
      throw new CreateOrderError("CUSTOMER_NOT_FOUND", "Cliente no encontrado.", {
        customerId: input.customerId,
      });
    }

    const leadThread = await tx.leadThread.findFirst({
      where: {
        contactId: input.customerId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
      },
    });

    if (!leadThread) {
      throw new CreateOrderError(
        "CUSTOMER_WITHOUT_CONVERSATION",
        "El cliente seleccionado no tiene una conversacion asociada para crear la orden.",
        {
          customerId: input.customerId,
        },
      );
    }

    const productIds = input.items.map((item) => item.productId);
    const productsById = await getCatalogProductsByIds(tx, productIds);
    const preparedItems = await Promise.all(input.items.map(async (item) => {
      const product = productsById.get(item.productId);

      if (!product) {
        throw new CreateOrderError("PRODUCT_NOT_FOUND", "Producto no encontrado.", {
          customerId: input.customerId,
          productId: item.productId,
        });
      }

      const pricing = await resolveProductPricing(
        { productId: product.id, qty: item.quantity },
        { db: tx },
      );
      const unitPriceCrc = requireLinearUnitPriceForOrder(pricing, {
        source: "create_order",
        productId: product.id,
        quantity: item.quantity,
      });

      return buildOrderItemCreateData({
        orderId: "",
        product,
        quantity: item.quantity,
        unitPriceCrc,
      });
    }));

    const subtotalCrc = calculateOrderItemsSubtotalCrc(
      preparedItems.map((item) => ({
        totalPriceCrc: item.totalPriceCrc,
      })),
    );

    const order = await tx.order.create({
      data: {
        leadThreadId: leadThread.id,
        contactId: input.customerId,
        statusLegacy: MANUAL_ORDER_INITIAL_STATUS,
        paymentStatus: MANUAL_ORDER_INITIAL_PAYMENT_STATUS,
        currency: "CRC",
        subtotalCrc,
        totalCrc: subtotalCrc,
        source: MANUAL_ORDER_SOURCE,
        status: MANUAL_ORDER_INITIAL_STATUS,
      },
      select: {
        id: true,
      },
    });

    await tx.orderItem.createMany({
      data: preparedItems.map((item) => ({
        ...item,
        orderId: order.id,
      })),
    });

    const createdOrder = await findOrderDetailRecord(tx, order.id);

    if (!createdOrder) {
      throw new CreateOrderError("CUSTOMER_NOT_FOUND", "No se pudo cargar la orden creada.", {
        customerId: input.customerId,
        orderId: order.id,
      });
    }

    return mapOrderDetail(createdOrder);
  });
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

    const product = (await getCatalogProductsByIds(tx, [input.productId])).get(input.productId);

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

    const pricing = await resolveProductPricing(
      { productId: product.id, qty: input.quantity },
      { db: tx },
    );
    const unitPriceCrc = requireLinearUnitPriceForOrder(pricing, {
      source: "create_order_item",
      orderId: input.orderId,
      productId: product.id,
      quantity: input.quantity,
    });

    await tx.orderItem.create({
      data: buildOrderItemCreateData({
        orderId: input.orderId,
        product,
        quantity: input.quantity,
        unitPriceCrc,
      }),
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

export async function createOrderActivity(
  input: {
    orderId: string;
    activity: CreateOrderActivityInput;
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
      throw new CreateOrderActivityError("ORDER_NOT_FOUND", "Order not found.", {
        orderId: input.orderId,
      });
    }

    await tx.orderActivity.create({
      data: {
        orderId: input.orderId,
        type: input.activity.type,
        content: input.activity.content.trim(),
      },
    });

    const updatedOrder = await findOrderDetailRecord(tx, input.orderId);

    if (!updatedOrder) {
      throw new CreateOrderActivityError("ORDER_NOT_FOUND", "Order not found.", {
        orderId: input.orderId,
      });
    }

    return mapOrderDetail(updatedOrder);
  });
}

export async function deleteOrderActivity(
  input: {
    orderId: string;
    activityId: string;
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
      throw new DeleteOrderActivityError("ORDER_NOT_FOUND", "Order not found.", {
        orderId: input.orderId,
      });
    }

    const activity = await tx.orderActivity.findUnique({
      where: {
        id: input.activityId,
      },
      select: {
        id: true,
        orderId: true,
      },
    });

    if (!activity) {
      throw new DeleteOrderActivityError("ACTIVITY_NOT_FOUND", "Order activity not found.", {
        orderId: input.orderId,
        activityId: input.activityId,
      });
    }

    if (activity.orderId !== input.orderId) {
      throw new DeleteOrderActivityError(
        "ACTIVITY_NOT_IN_ORDER",
        "Order activity does not belong to the requested order.",
        {
          orderId: input.orderId,
          activityId: input.activityId,
          activityOrderId: activity.orderId,
        },
      );
    }

    await tx.orderActivity.delete({
      where: {
        id: input.activityId,
      },
    });

    const updatedOrder = await findOrderDetailRecord(tx, input.orderId);

    if (!updatedOrder) {
      throw new DeleteOrderActivityError("ORDER_NOT_FOUND", "Order not found.", {
        orderId: input.orderId,
      });
    }

    return mapOrderDetail(updatedOrder);
  });
}

export async function updateOrderActivity(
  input: {
    orderId: string;
    activityId: string;
    activity: UpdateOrderActivityInput;
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
      throw new UpdateOrderActivityError("ORDER_NOT_FOUND", "Order not found.", {
        orderId: input.orderId,
      });
    }

    const activity = await tx.orderActivity.findUnique({
      where: {
        id: input.activityId,
      },
      select: {
        id: true,
        orderId: true,
      },
    });

    if (!activity) {
      throw new UpdateOrderActivityError("ACTIVITY_NOT_FOUND", "Order activity not found.", {
        orderId: input.orderId,
        activityId: input.activityId,
      });
    }

    if (activity.orderId !== input.orderId) {
      throw new UpdateOrderActivityError(
        "ACTIVITY_NOT_IN_ORDER",
        "Order activity does not belong to the requested order.",
        {
          orderId: input.orderId,
          activityId: input.activityId,
          activityOrderId: activity.orderId,
        },
      );
    }

    await tx.orderActivity.update({
      where: {
        id: input.activityId,
      },
      data: {
        content: input.activity.content.trim(),
      },
    });

    const updatedOrder = await findOrderDetailRecord(tx, input.orderId);

    if (!updatedOrder) {
      throw new UpdateOrderActivityError("ORDER_NOT_FOUND", "Order not found.", {
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
        productId: true,
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

    if (!item.productId) {
      throw new UpdateOrderItemQuantityError(
        "PRICING_CONFIGURATION_INVALID",
        "El item no tiene producto asociado para resolver pricing.",
        {
          orderId: input.orderId,
          itemId: input.itemId.toString(),
        },
      );
    }

    const pricing = await resolveProductPricing(
      { productId: item.productId, qty: input.quantity },
      { db: tx },
    );
    const unitPriceCrc = requireLinearUnitPriceForOrder(pricing, {
      source: "update_order_item_quantity",
      orderId: input.orderId,
      itemId: input.itemId.toString(),
      productId: item.productId,
      quantity: input.quantity,
    });
    const nextLineTotal = unitPriceCrc * input.quantity;

    await tx.orderItem.update({
      where: {
        id: item.id,
      },
      data: {
        quantity: input.quantity,
        unitPriceCrc,
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

export async function updateOrderItemDeliveryDate(
  input: {
    orderId: string;
    itemId: bigint;
    deliveryDate: string | null;
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
      throw new UpdateOrderItemDeliveryDateError("ORDER_NOT_FOUND", "Order not found.", {
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
      throw new UpdateOrderItemDeliveryDateError("ITEM_NOT_FOUND", "Order item not found.", {
        orderId: input.orderId,
        itemId: input.itemId.toString(),
      });
    }

    if (item.orderId !== input.orderId) {
      throw new UpdateOrderItemDeliveryDateError(
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
        deliveryDate: input.deliveryDate ? new Date(`${input.deliveryDate}T00:00:00.000Z`) : null,
      },
    });

    const updatedOrder = await findOrderDetailRecord(tx, input.orderId);

    if (!updatedOrder) {
      throw new UpdateOrderItemDeliveryDateError("ORDER_NOT_FOUND", "Order not found.", {
        orderId: input.orderId,
      });
    }

    return mapOrderDetail(updatedOrder);
  });
}

export async function updateOrderDeliveryDate(
  input: {
    orderId: string;
    deliveryDate: string | null;
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
      throw new UpdateOrderDeliveryDateError("ORDER_NOT_FOUND", "Order not found.", {
        orderId: input.orderId,
      });
    }

    await tx.order.update({
      where: {
        id: input.orderId,
      },
      data: {
        deliveryDate: input.deliveryDate ? new Date(`${input.deliveryDate}T00:00:00.000Z`) : null,
      },
    });

    const updatedOrder = await findOrderDetailRecord(tx, input.orderId);

    if (!updatedOrder) {
      throw new UpdateOrderDeliveryDateError("ORDER_NOT_FOUND", "Order not found.", {
        orderId: input.orderId,
      });
    }

    return mapOrderDetail(updatedOrder);
  });
}

export async function updateOrder(
  input: {
    orderId: string;
    patch: UpdateOrderInput;
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
        status: true,
      },
    });

    if (!order) {
      throw new UpdateOrderError("ORDER_NOT_FOUND", "Order not found.", {
        orderId: input.orderId,
      });
    }

    const nextData: Prisma.OrderUpdateInput = {};

    if (input.patch.status !== undefined) {
      const isRestrictedTargetStatus = ORDER_STATUSES_REQUIRING_VALIDATED_RECEIPT.has(
        input.patch.status,
      );

      if (isRestrictedTargetStatus) {
        const validReceiptCount = await tx.paymentReceipt.count({
          where: {
            orderId: input.orderId,
            status: PaymentReceiptStatusEnum.validated,
            deletedAt: null,
          },
        });

        if (validReceiptCount === 0) {
          throw new UpdateOrderError(
            "STATUS_REQUIRES_VALID_RECEIPT",
            `No se puede cambiar el estado a ${formatOrderStatusForValidationMessage(input.patch.status)} sin un comprobante de pago válido.`,
            {
              orderId: input.orderId,
              currentStatus: order.status,
              targetStatus: input.patch.status,
              requiresValidatedReceipt: true,
            },
          );
        }
      }

      nextData.status = input.patch.status;
    }

    if (input.patch.deliveryDate !== undefined) {
      nextData.deliveryDate = input.patch.deliveryDate
        ? new Date(`${input.patch.deliveryDate}T00:00:00.000Z`)
        : null;
    }

    if (Object.keys(nextData).length > 0) {
      await tx.order.update({
        where: {
          id: input.orderId,
        },
        data: nextData,
      });
    }

    const updatedOrder = await findOrderDetailRecord(tx, input.orderId);

    if (!updatedOrder) {
      throw new UpdateOrderError("ORDER_NOT_FOUND", "Order not found.", {
        orderId: input.orderId,
      });
    }

    return mapOrderDetail(updatedOrder);
  });
}

export async function deleteOrder(
  orderId: string,
  options?: ServiceOptions,
): Promise<{ id: string }> {
  const db = resolveDb(options);

  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: {
        id: orderId,
      },
      select: {
        id: true,
      },
    });

    if (!order) {
      throw new DeleteOrderError("ORDER_NOT_FOUND", "Order not found.", {
        orderId,
      });
    }

    await tx.orderItem.deleteMany({
      where: {
        orderId,
      },
    });

    await tx.order.delete({
      where: {
        id: orderId,
      },
    });

    return {
      id: orderId,
    };
  });
}

export async function createPaymentReceipt(
  input: CreatePaymentReceiptInput,
  options?: ServiceOptions,
): Promise<OrderDetail> {
  const db = resolveDb(options);

  return db.$transaction(async (tx) => {
    const order = await ensureOrderExists(tx, input.orderId);
    const receiptKey = normalizeOptionalText(input.receiptKey) ?? buildManualReceiptKey(input.orderId);
    const resolvedBank = await resolveBankReference(tx, input);

    try {
      const createdReceipt = await tx.paymentReceipt.create({
        data: {
          orderId: input.orderId,
          messageId: input.messageId ?? null,
          receiptKey,
          status: PaymentReceiptStatusEnum.pending_validation,
          amountCrc: input.amountCrc,
          amountText: normalizeOptionalText(input.amountText),
          currency: normalizeOptionalText(input.currency) ?? DEFAULT_RECEIPT_CURRENCY,
          bankId: resolvedBank.bankId,
          bank: resolvedBank.bankName,
          transferType: normalizeOptionalText(input.transferType),
          reference: normalizeOptionalText(input.reference),
          senderName: normalizeOptionalText(input.senderName),
          recipientName: normalizeOptionalText(input.recipientName),
          destinationPhone: normalizeOptionalText(input.destinationPhone),
          receiptDate: normalizeReceiptDateInput(input.receiptDate),
          receiptTime: normalizeOptionalText(input.receiptTime),
          source: PaymentReceiptSourceEnum.manual_crm,
          internalNotes: normalizeOptionalText(input.internalNotes),
          rawPayload: input.rawPayload ?? {},
        },
        select: {
          id: true,
          receiptKey: true,
          amountCrc: true,
        },
      });

      if (order.status === OrderStatusEnum.draft) {
        await tx.order.update({
          where: {
            id: input.orderId,
          },
          data: {
            status: OrderStatusEnum.pending_payment,
          },
        });
      }

      await recomputeOrderPaymentStateTx(tx, input.orderId);

      await appendOrderActivityForReceiptEvent(tx, {
        orderId: input.orderId,
        receiptId: createdReceipt.id,
        activityType: ORDER_ACTIVITY_TYPE_SYSTEM_EVENT,
        content: "Payment receipt created.",
        metadata: {
          receiptId: createdReceipt.id,
          receiptKey: createdReceipt.receiptKey,
          amountCrc: createdReceipt.amountCrc,
          source: PaymentReceiptSourceEnum.manual_crm,
          status: PaymentReceiptStatusEnum.pending_validation,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const { prismaCode, prismaClientVersion } = resolvePrismaErrorMetadata(error);
        await logWarn({
          source: "service.orders",
          eventType: "orders_api_error",
          message: "Duplicate receipt key while creating payment receipt.",
          errorMessage: error.message,
          metadata: {
            operation: "create_payment_receipt",
            errorStage: "receipt_create_insert",
            errorName: error.name,
            errorCode: error.code,
            orderId: input.orderId,
            prismaCode,
            prismaClientVersion,
            environment: process.env.VERCEL_ENV?.trim() || process.env.NODE_ENV?.trim() || "unknown",
          },
        });

        throw new PaymentReceiptError(
          "DUPLICATE_RECEIPT_KEY",
          "A payment receipt with the same receipt key already exists.",
          {
            orderId: input.orderId,
            receiptKey,
          },
        );
      }

      const { prismaCode, prismaClientVersion } = resolvePrismaErrorMetadata(error);
      await logError({
        source: "service.orders",
        eventType: "orders_api_error",
        message: "createPaymentReceipt failed with unexpected error.",
        errorMessage: error instanceof Error ? error.message : "Unknown orders service error",
        stackTrace: error instanceof Error ? error.stack : null,
        metadata: {
          operation: "create_payment_receipt",
          errorStage: "receipt_create_insert",
          errorName: error instanceof Error ? error.name : "UnknownError",
          errorCode:
            error instanceof Prisma.PrismaClientKnownRequestError
              ? error.code
              : null,
          orderId: input.orderId,
          prismaCode,
          prismaClientVersion,
          environment: process.env.VERCEL_ENV?.trim() || process.env.NODE_ENV?.trim() || "unknown",
        },
      });

      throw error;
    }

    const updatedOrder = await findOrderDetailRecord(tx, input.orderId);

    if (!updatedOrder) {
      throw new PaymentReceiptError("ORDER_NOT_FOUND", "Order not found.", {
        orderId: input.orderId,
      });
    }

    return mapOrderDetail(updatedOrder);
  });
}

export async function updatePaymentReceipt(
  input: UpdatePaymentReceiptInput,
  options?: ServiceOptions,
): Promise<OrderDetail> {
  const db = resolveDb(options);

  return db.$transaction(async (tx) => {
    await ensureOrderExists(tx, input.orderId);
    const receipt = await getScopedReceiptOrThrow(tx, input);

    if (receipt.status === PaymentReceiptStatusEnum.validated) {
      throw new PaymentReceiptError(
        "RECEIPT_ALREADY_VALIDATED",
        "Validated payment receipts cannot be edited.",
        {
          orderId: input.orderId,
          receiptId: input.receiptId,
        },
      );
    }

    if (receipt.status === PaymentReceiptStatusEnum.soft_deleted || receipt.deletedAt) {
      throw new PaymentReceiptError(
        "RECEIPT_SOFT_DELETED",
        "Soft deleted payment receipts cannot be edited.",
        {
          orderId: input.orderId,
          receiptId: input.receiptId,
        },
      );
    }

    const resolvedBank =
      input.bankId !== undefined || input.bank !== undefined
        ? await resolveBankReference(tx, input)
        : null;

    await tx.paymentReceipt.update({
      where: {
        id: input.receiptId,
      },
      data: {
        ...(input.amountCrc !== undefined ? { amountCrc: input.amountCrc } : {}),
        ...(input.amountText !== undefined ? { amountText: normalizeOptionalText(input.amountText) } : {}),
        ...(input.currency !== undefined
          ? { currency: normalizeOptionalText(input.currency) ?? DEFAULT_RECEIPT_CURRENCY }
          : {}),
        ...(resolvedBank
          ? {
              bankId: resolvedBank.bankId,
              bank: resolvedBank.bankName,
            }
          : {}),
        ...(input.transferType !== undefined
          ? { transferType: normalizeOptionalText(input.transferType) }
          : {}),
        ...(input.reference !== undefined ? { reference: normalizeOptionalText(input.reference) } : {}),
        ...(input.senderName !== undefined ? { senderName: normalizeOptionalText(input.senderName) } : {}),
        ...(input.recipientName !== undefined
          ? { recipientName: normalizeOptionalText(input.recipientName) }
          : {}),
        ...(input.destinationPhone !== undefined
          ? { destinationPhone: normalizeOptionalText(input.destinationPhone) }
          : {}),
        ...(input.receiptDate !== undefined
          ? { receiptDate: normalizeReceiptDateInput(input.receiptDate) }
          : {}),
        ...(input.receiptTime !== undefined
          ? { receiptTime: normalizeOptionalText(input.receiptTime) }
          : {}),
        ...(input.internalNotes !== undefined
          ? { internalNotes: normalizeOptionalText(input.internalNotes) }
          : {}),
      },
    });

    await appendOrderActivityForReceiptEvent(tx, {
      orderId: input.orderId,
      receiptId: input.receiptId,
      activityType: ORDER_ACTIVITY_TYPE_SYSTEM_EVENT,
      content: "Payment receipt updated.",
      metadata: {
        receiptId: input.receiptId,
      },
    });

    const updatedOrder = await findOrderDetailRecord(tx, input.orderId);

    if (!updatedOrder) {
      throw new PaymentReceiptError("ORDER_NOT_FOUND", "Order not found.", {
        orderId: input.orderId,
      });
    }

    return mapOrderDetail(updatedOrder);
  });
}

export async function validatePaymentReceipt(
  input: PaymentReceiptMutationInput,
  options?: ServiceOptions,
): Promise<OrderDetail> {
  const db = resolveDb(options);

  return db.$transaction(async (tx) => {
    const orderBeforeValidation = await ensureOrderExists(tx, input.orderId);
    const receipt = await getScopedReceiptOrThrow(tx, input);

    if (receipt.status === PaymentReceiptStatusEnum.validated) {
      throw new PaymentReceiptError(
        "RECEIPT_ALREADY_VALIDATED",
        "Payment receipt is already validated.",
        {
          orderId: input.orderId,
          receiptId: input.receiptId,
        },
      );
    }

    if (receipt.status === PaymentReceiptStatusEnum.soft_deleted || receipt.deletedAt) {
      throw new PaymentReceiptError(
        "RECEIPT_SOFT_DELETED",
        "Soft deleted payment receipts cannot be validated.",
        {
          orderId: input.orderId,
          receiptId: input.receiptId,
        },
      );
    }

    if (receipt.amountCrc == null) {
      throw new PaymentReceiptError(
        "RECEIPT_AMOUNT_REQUIRED",
        "Payment receipt requires amountCrc before validation.",
        {
          orderId: input.orderId,
          receiptId: input.receiptId,
        },
      );
    }

    await tx.paymentReceipt.update({
      where: {
        id: input.receiptId,
      },
      data: {
        status: PaymentReceiptStatusEnum.validated,
        validatedAt: new Date(),
        validatedBy: normalizeOptionalText(input.performedBy),
        ...(input.internalNotes !== undefined
          ? { internalNotes: normalizeOptionalText(input.internalNotes) }
          : {}),
        deletedAt: null,
        deletedBy: null,
      },
    });

    await recomputeOrderPaymentStateTx(tx, input.orderId);
    const orderAfterRecompute = await tx.order.findUnique({
      where: {
        id: input.orderId,
      },
      select: {
        status: true,
        leadThreadId: true,
      },
    });

    if (!orderAfterRecompute) {
      throw new PaymentReceiptError("ORDER_NOT_FOUND", "Order not found.", {
        orderId: input.orderId,
      });
    }

    const movedToProductionInThisOperation =
      orderBeforeValidation.status !== OrderStatusEnum.in_production &&
      orderAfterRecompute.status === OrderStatusEnum.in_production;

    if (movedToProductionInThisOperation) {
      await transitionLeadToWonForValidatedReceiptTx(tx, {
        leadThreadId: orderAfterRecompute.leadThreadId,
        orderId: input.orderId,
        receiptId: input.receiptId,
        performedBy: input.performedBy,
      });
    }

    await appendValidatedReceiptSystemMessageTx(tx, {
      leadThreadId: orderAfterRecompute.leadThreadId,
      performedBy: normalizeOptionalText(input.performedBy),
      receiptId: receipt.id,
      amountCrc: receipt.amountCrc,
      bank: receipt.bank,
      transferType: receipt.transferType,
      reference: receipt.reference,
      receiptDate: receipt.receiptDate,
      receiptTime: receipt.receiptTime,
      senderName: receipt.senderName,
      destinationPhone: receipt.destinationPhone,
      recipientName: receipt.recipientName,
    });

    await appendOrderActivityForReceiptEvent(tx, {
      orderId: input.orderId,
      receiptId: input.receiptId,
      createdBy: input.performedBy,
      content: "Payment receipt validated.",
      metadata: {
        receiptId: input.receiptId,
        status: PaymentReceiptStatusEnum.validated,
        validatedBy: normalizeOptionalText(input.performedBy),
      },
    });

    const updatedOrder = await findOrderDetailRecord(tx, input.orderId);

    if (!updatedOrder) {
      throw new PaymentReceiptError("ORDER_NOT_FOUND", "Order not found.", {
        orderId: input.orderId,
      });
    }

    return mapOrderDetail(updatedOrder);
  });
}

export async function rejectPaymentReceipt(
  input: PaymentReceiptMutationInput,
  options?: ServiceOptions,
): Promise<OrderDetail> {
  return mutatePaymentReceiptStatus(
    {
      ...input,
      nextStatus: PaymentReceiptStatusEnum.rejected,
      activityMessage: "Payment receipt rejected.",
    },
    options,
  );
}

export async function cancelPaymentReceipt(
  input: PaymentReceiptMutationInput,
  options?: ServiceOptions,
): Promise<OrderDetail> {
  return mutatePaymentReceiptStatus(
    {
      ...input,
      nextStatus: PaymentReceiptStatusEnum.cancelled,
      activityMessage: "Payment receipt cancelled.",
    },
    options,
  );
}

export async function softDeletePaymentReceipt(
  input: PaymentReceiptMutationInput,
  options?: ServiceOptions,
): Promise<OrderDetail> {
  return mutatePaymentReceiptStatus(
    {
      ...input,
      nextStatus: PaymentReceiptStatusEnum.soft_deleted,
      activityMessage: "Payment receipt soft deleted.",
    },
    options,
  );
}

async function mutatePaymentReceiptStatus(
  input: PaymentReceiptMutationInput & {
    nextStatus: PaymentReceiptStatusEnum;
    activityMessage: string;
  },
  options?: ServiceOptions,
): Promise<OrderDetail> {
  const db = resolveDb(options);

  return db.$transaction(async (tx) => {
    await ensureOrderExists(tx, input.orderId);
    const receipt = await getScopedReceiptOrThrow(tx, input);

    if (receipt.status === input.nextStatus) {
      throw new PaymentReceiptError(
        "INVALID_RECEIPT_TRANSITION",
        "Payment receipt is already in the requested status.",
        {
          orderId: input.orderId,
          receiptId: input.receiptId,
          status: receipt.status,
          nextStatus: input.nextStatus,
        },
      );
    }

    if (receipt.status === PaymentReceiptStatusEnum.soft_deleted || receipt.deletedAt) {
      throw new PaymentReceiptError(
        "RECEIPT_SOFT_DELETED",
        "Soft deleted payment receipts cannot transition to another status.",
        {
          orderId: input.orderId,
          receiptId: input.receiptId,
        },
      );
    }

    await tx.paymentReceipt.update({
      where: {
        id: input.receiptId,
      },
      data: {
        status: input.nextStatus,
        ...(input.nextStatus === PaymentReceiptStatusEnum.soft_deleted
          ? {
              deletedAt: new Date(),
              deletedBy: normalizeOptionalText(input.performedBy),
            }
          : {
              deletedAt: null,
              deletedBy: null,
            }),
        validatedAt: null,
        validatedBy: null,
        ...(input.internalNotes !== undefined
          ? { internalNotes: normalizeOptionalText(input.internalNotes) }
          : {}),
      },
    });

    await recomputeOrderPaymentStateTx(tx, input.orderId);

    await appendOrderActivityForReceiptEvent(tx, {
      orderId: input.orderId,
      receiptId: input.receiptId,
      createdBy: input.performedBy,
      content: input.activityMessage,
      metadata: {
        receiptId: input.receiptId,
        status: input.nextStatus,
        performedBy: normalizeOptionalText(input.performedBy),
      },
    });

    const updatedOrder = await findOrderDetailRecord(tx, input.orderId);

    if (!updatedOrder) {
      throw new PaymentReceiptError("ORDER_NOT_FOUND", "Order not found.", {
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
  _options?: ServiceOptions,
): Promise<never> {
  throw new PaymentReceiptError(
    "INVALID_RECEIPT_TRANSITION",
    "Order-level payment confirmation is deprecated. Validate a payment receipt by receiptId instead.",
    {
      orderId,
      deprecated: true,
    },
  );
}

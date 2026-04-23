import type { LeadStageType, OrderStatusEnum } from "@prisma/client";

import type {
  CustomerReference,
  CustomerReferenceWithExternalId,
  PagedResponse,
  PaginationParams,
} from "./common";

export const orderSortValues = ["recent", "oldest", "highest_total"] as const;
export const paymentReceiptTransferTypeValues = [
  "Transferencia",
  "Sinpe",
  "Efectivo",
] as const;

export const orderStatusesRequiringValidatedReceipt = [
  "confirmed",
  "in_design",
  "in_production",
  "ready",
  "shipped",
  "completed",
] as const satisfies readonly OrderStatusEnum[];

export const orderStatusesAllowedWithoutValidatedReceipt = [
  "draft",
  "quoted",
  "pending_payment",
  "payment_review",
  "cancelled",
] as const satisfies readonly OrderStatusEnum[];
type PaymentReceiptTransferType = (typeof paymentReceiptTransferTypeValues)[number];

export type OrderSort = (typeof orderSortValues)[number];

export interface ListOrdersParams extends PaginationParams {
  search?: string;
  status?: OrderStatusEnum;
  paymentStatus?: string;
  sort?: OrderSort;
}

export interface OrderListItem {
  id: string;
  status: OrderStatusEnum;
  paymentStatus: string;
  totalCrc: number;
  subtotalCrc: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  deliveryDate: string | null;
  customer: CustomerReference;
}

export type OrdersListResponse = PagedResponse<OrderListItem>;

export interface OrderFilterOptions {
  paymentStatuses: string[];
}

export interface OrderPaymentConfirmationResult {
  id: string;
  status: OrderStatusEnum;
  paymentStatus: string;
  updatedAt: string;
}

export type OrderActivityType =
  | "note"
  | "status_change"
  | "payment_validation"
  | "system_event";

export interface DeleteOrderResult {
  id: string;
}

export interface OrderActivityEntry {
  id: string;
  type: OrderActivityType;
  content: string | null;
  metadata: unknown | null;
  createdAt: string;
  createdBy: string | null;
}

export interface OrderItemSummary {
  id: string;
  productId: string | null;
  productName: string | null;
  sku: string | null;
  quantity: number;
  unitPriceCrc: number | null;
  totalPriceCrc: number | null;
  theme: string | null;
  deliveryDate: string | null;
  notes: string | null;
}

export interface OrderItemProductOption {
  id: string;
  name: string;
  sku: string;
  unitPriceCrc: number | null;
  pricingStatus: "quotable" | "manual_required" | "min_qty_not_met" | "configuration_invalid";
  pricingMode:
    | "base"
    | "base_below_promo"
    | "range"
    | "block_exact"
    | "block_round_up"
    | "block_post_top"
    | "manual_required"
    | "min_qty_not_met"
    | "configuration_invalid";
  quotedQty: number | null;
  suggestedQty: number | null;
  minQty: number | null;
  totalCrc: number | null;
  pricingMessage: string;
  requiresManualReview: boolean;
  category: string;
  family: string;
}

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
}

export interface CreateOrderInput {
  customerId: string;
  items: CreateOrderItemInput[];
}

export interface CreateOrderActivityInput {
  type: OrderActivityType;
  content: string;
}

export interface UpdateOrderActivityInput {
  content: string;
}

export interface UpdateOrderInput {
  status?: OrderStatusEnum;
  deliveryDate?: string | null;
}

export interface CreatePaymentReceiptInput {
  amountCrc: number;
  currency?: string;
  bankId?: string | null;
  bank?: string | null;
  transferType?: PaymentReceiptTransferType | null;
  reference?: string | null;
  senderName?: string | null;
  recipientName?: string | null;
  destinationPhone?: string | null;
  receiptDate?: string | null;
  receiptTime?: string | null;
  internalNotes?: string | null;
}

export interface UpdatePaymentReceiptInput {
  amountCrc?: number;
  currency?: string;
  bankId?: string | null;
  bank?: string | null;
  transferType?: PaymentReceiptTransferType | null;
  reference?: string | null;
  senderName?: string | null;
  recipientName?: string | null;
  destinationPhone?: string | null;
  receiptDate?: string | null;
  receiptTime?: string | null;
  internalNotes?: string | null;
}

export interface PaymentReceiptReviewActionInput {
  performedBy: string;
  internalNotes?: string | null;
}

export function normalizePaymentReceiptTransferType(
  value: string | null | undefined,
): PaymentReceiptTransferType | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized === "transferencia") {
    return "Transferencia";
  }

  if (normalized === "sinpe") {
    return "Sinpe";
  }

  if (normalized === "efectivo") {
    return "Efectivo";
  }

  return null;
}

export interface OrderReceiptSummary {
  id: string;
  status: string;
  amountCrc: number | null;
  bankId: string | null;
  bank: string | null;
  transferType: string | null;
  amountText: string | null;
  currency: string | null;
  reference: string | null;
  senderName: string | null;
  recipientName: string | null;
  destinationPhone: string | null;
  receiptDate: string | null;
  receiptTime: string | null;
  internalNotes: string | null;
  createdAt: string;
}

export interface OrderDetail {
  id: string;
  status: OrderStatusEnum;
  statusLegacy: string;
  paymentStatus: string;
  currency: string;
  subtotalCrc: number;
  totalCrc: number;
  source: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deliveryDate: string | null;
  advancePaidCrc: number;
  pendingValidationCrc: number;
  customer: CustomerReferenceWithExternalId;
  conversation: {
    id: string;
    leadThreadKey: string;
    leadStage: LeadStageType;
  };
  activities: OrderActivityEntry[];
  items: OrderItemSummary[];
  receipts: OrderReceiptSummary[];
}

export function calculateOrderItemSubtotalCrc(input: {
  quantity: number;
  unitPriceCrc: number | null;
}) {
  if (input.unitPriceCrc == null) {
    return null;
  }

  return input.quantity * input.unitPriceCrc;
}

export function calculateOrderItemsSubtotalCrc(
  items: Array<{
    totalPriceCrc: number | null | undefined;
  }>,
) {
  return items.reduce((sum, item) => sum + (item.totalPriceCrc ?? 0), 0);
}

export function calculateOrderReceiptAggregates(
  receipts: Array<{
    status: string;
    amountCrc: number | null | undefined;
  }>,
) {
  return receipts.reduce(
    (accumulator, receipt) => {
      const amountCrc = receipt.amountCrc ?? 0;

      if (amountCrc <= 0) {
        return accumulator;
      }

      const normalizedStatus = receipt.status.trim().toLowerCase();

      if (normalizedStatus === "validated") {
        accumulator.advancePaidCrc += amountCrc;
      } else if (normalizedStatus === "pending_validation") {
        accumulator.pendingValidationCrc += amountCrc;
      }

      return accumulator;
    },
    {
      advancePaidCrc: 0,
      pendingValidationCrc: 0,
    },
  );
}

import type { Contact, LeadThread, Order, OrderActivity, OrderItem, PaymentReceipt } from "@prisma/client";

import {
  mapConversationStageReference,
  mapCustomerReference,
  mapCustomerReferenceWithExternalId,
} from "@/domain/crm/mappers";
import { toNullableIsoDate } from "@/server/services/shared";

import type {
  OrderActivityEntry,
  OrderDetail,
  OrderItemProductOption,
  OrderItemSummary,
  OrderListItem,
  OrderReceiptSummary,
} from "./types";

type OrderListRecord = Pick<
  Order,
  | "id"
  | "status"
  | "paymentStatus"
  | "totalCrc"
  | "subtotalCrc"
  | "currency"
  | "createdAt"
  | "updatedAt"
  | "deliveryDate"
> & {
  contact: Pick<Contact, "id" | "displayName"> | null;
};

type OrderDetailRecord = Order & {
  contact: Pick<Contact, "id" | "displayName" | "externalId"> | null;
  leadThread: Pick<LeadThread, "id" | "leadThreadKey" | "leadStage">;
  activityEntries: Pick<
    OrderActivity,
    "id" | "type" | "content" | "metadata" | "createdAt" | "createdBy"
  >[];
  items: Pick<
    OrderItem,
    | "id"
    | "productId"
    | "productNameSnapshot"
    | "skuSnapshot"
    | "quantity"
    | "unitPriceCrc"
    | "totalPriceCrc"
    | "theme"
    | "deliveryDate"
    | "itemNotes"
  >[];
  paymentReceipts: Pick<
    PaymentReceipt,
    | "id"
    | "status"
    | "bank"
    | "transferType"
    | "amountText"
    | "currency"
    | "reference"
    | "senderName"
    | "recipientName"
    | "destinationPhone"
    | "receiptDate"
    | "createdAt"
  >[];
};

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const normalized = value.trim();

  if (!normalized || normalized.toLowerCase() === "null") {
    return null;
  }

  return normalized;
}

export function mapOrderListItem(order: OrderListRecord): OrderListItem {
  return {
    id: order.id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalCrc: order.totalCrc,
    subtotalCrc: order.subtotalCrc,
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    deliveryDate: toNullableIsoDate(order.deliveryDate),
    customer: mapCustomerReference({
      id: order.contact?.id,
      name: order.contact?.displayName,
    }),
  };
}

export function mapOrderItemSummary(item: OrderDetailRecord["items"][number]): OrderItemSummary {
  return {
    id: item.id.toString(),
    productId: item.productId,
    productName: item.productNameSnapshot,
    sku: item.skuSnapshot,
    quantity: item.quantity,
    unitPriceCrc: item.unitPriceCrc,
    totalPriceCrc: item.totalPriceCrc,
    theme: item.theme,
    deliveryDate: item.deliveryDate ? item.deliveryDate.toISOString().slice(0, 10) : null,
    notes: normalizeOptionalText(item.itemNotes),
  };
}

export function mapOrderItemProductOption(input: {
  id: string;
  name: string;
  sku: string;
  priceCrc: number | null;
  priceFromCrc: number | null;
  category: string;
  family: string;
}): OrderItemProductOption {
  return {
    id: input.id,
    name: input.name,
    sku: input.sku,
    unitPriceCrc: input.priceCrc ?? input.priceFromCrc ?? null,
    category: input.category,
    family: input.family,
  };
}

export function mapOrderReceiptSummary(
  receipt: OrderDetailRecord["paymentReceipts"][number],
): OrderReceiptSummary {
  return {
    id: receipt.id,
    status: receipt.status,
    bank: receipt.bank,
    transferType: receipt.transferType,
    amountText: receipt.amountText,
    currency: receipt.currency,
    reference: receipt.reference,
    senderName: receipt.senderName,
    recipientName: receipt.recipientName,
    destinationPhone: receipt.destinationPhone,
    receiptDate: toNullableIsoDate(receipt.receiptDate),
    createdAt: receipt.createdAt.toISOString(),
  };
}

export function mapOrderActivityEntry(
  activity: OrderDetailRecord["activityEntries"][number],
): OrderActivityEntry {
  return {
    id: activity.id,
    type: activity.type as OrderActivityEntry["type"],
    content: normalizeOptionalText(activity.content),
    metadata: activity.metadata ?? null,
    createdAt: activity.createdAt.toISOString(),
    createdBy: normalizeOptionalText(activity.createdBy),
  };
}

export function mapOrderDetail(order: OrderDetailRecord): OrderDetail {
  return {
    id: order.id,
    status: order.status,
    statusLegacy: order.statusLegacy,
    paymentStatus: order.paymentStatus,
    currency: order.currency,
    subtotalCrc: order.subtotalCrc,
    totalCrc: order.totalCrc,
    source: order.source,
    notes: normalizeOptionalText(order.notes),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    deliveryDate: toNullableIsoDate(order.deliveryDate),
    customer: mapCustomerReferenceWithExternalId({
      id: order.contact?.id,
      name: order.contact?.displayName,
      externalId: order.contact?.externalId,
    }),
    conversation: mapConversationStageReference({
      id: order.leadThread.id,
      leadThreadKey: order.leadThread.leadThreadKey,
      leadStage: order.leadThread.leadStage,
    }),
    activities: order.activityEntries.map(mapOrderActivityEntry),
    items: order.items.map(mapOrderItemSummary),
    receipts: order.paymentReceipts.map(mapOrderReceiptSummary),
  };
}

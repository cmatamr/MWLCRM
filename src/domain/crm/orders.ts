import type { LeadStageType, OrderStatusEnum } from "@prisma/client";

import type {
  CustomerReference,
  CustomerReferenceWithExternalId,
  PagedResponse,
  PaginationParams,
} from "./common";

export const orderSortValues = ["recent", "oldest", "highest_total"] as const;

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

export interface OrderItemSummary {
  id: string;
  productId: string | null;
  productName: string | null;
  sku: string | null;
  quantity: number;
  unitPriceCrc: number | null;
  totalPriceCrc: number | null;
  theme: string | null;
  eventDate: string | null;
  notes: string | null;
}

export interface OrderItemProductOption {
  id: string;
  name: string;
  sku: string;
  unitPriceCrc: number | null;
  category: string;
  family: string;
}

export interface OrderReceiptSummary {
  id: string;
  status: string;
  bank: string | null;
  transferType: string | null;
  amountText: string | null;
  currency: string | null;
  reference: string | null;
  senderName: string | null;
  recipientName: string | null;
  destinationPhone: string | null;
  receiptDate: string | null;
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
  customer: CustomerReferenceWithExternalId;
  conversation: {
    id: string;
    leadThreadKey: string;
    leadStage: LeadStageType;
  };
  items: OrderItemSummary[];
  receipts: OrderReceiptSummary[];
}

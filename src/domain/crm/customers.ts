import type { ChannelType, LeadStageType, OrderStatusEnum } from "@prisma/client";

import type { PagedResponse, PaginationParams } from "./common";

export const customerSortValues = [
  "recent",
  "highest_spent",
  "most_orders",
  "name",
] as const;

export type CustomerSort = (typeof customerSortValues)[number];

export interface ListCustomersParams extends PaginationParams {
  search?: string;
  status?: string;
  channel?: ChannelType;
  sort?: CustomerSort;
}

export interface CreateCustomerInput {
  primaryChannel: ChannelType;
  externalId: string;
  displayName: string;
  customerStatus?: string;
}

export interface CustomerListItem {
  id: string;
  displayName: string | null;
  externalId: string;
  primaryChannel: ChannelType;
  customerStatus: string | null;
  totalOrders: number;
  totalSpentCrc: number;
  lastOrderAt: string | null;
  createdAt: string;
}

export type CustomersListResponse = PagedResponse<CustomerListItem>;

export interface CustomerOrderSummary {
  id: string;
  status: OrderStatusEnum;
  totalCrc: number;
  createdAt: string;
}

export interface CustomerConversationSummary {
  id: string;
  leadThreadKey: string;
  leadStage: LeadStageType;
  updatedAt: string;
  lastMessagePreview: string | null;
  messageCount: number;
}

export interface CustomerMetrics {
  totalOrders: number;
  totalSpentCrc: number;
  lastOrderAt: string | null;
}

export interface CustomerDetail {
  id: string;
  displayName: string | null;
  externalId: string;
  primaryChannel: ChannelType;
  customerStatus: string | null;
  metrics: CustomerMetrics;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  orders: CustomerOrderSummary[];
  conversations: CustomerConversationSummary[];
}

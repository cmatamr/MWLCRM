import type { Contact, LeadThread, Message, Order } from "@prisma/client";

import { mapCustomerTags } from "@/domain/crm/mappers";
import { toNullableIsoDate } from "@/server/services/shared";

import type {
  CustomerConversationSummary,
  CustomerDetail,
  CustomerMetrics,
  CustomerListItem,
  CustomerOrderSummary,
} from "./types";

type CustomerListContactRecord = Pick<
  Contact,
  | "id"
  | "displayName"
  | "externalId"
  | "primaryChannel"
  | "customerStatus"
  | "createdAt"
>;

type CustomerDetailContactRecord = CustomerListContactRecord &
  Pick<
    Contact,
    | "updatedAt"
    | "tags"
  >;

type OrderRecord = Pick<Order, "id" | "status" | "totalCrc" | "createdAt">;

type ThreadRecord = Pick<LeadThread, "id" | "leadThreadKey" | "leadStage" | "updatedAt"> & {
  messages: Pick<Message, "text">[];
  _count: {
    messages: number;
  };
};

export function mapCustomerMetrics(input?: {
  totalOrders?: number | null;
  totalSpentCrc?: number | null;
  lastOrderAt?: Date | null;
}): CustomerMetrics {
  return {
    totalOrders: input?.totalOrders ?? 0,
    totalSpentCrc: input?.totalSpentCrc ?? 0,
    lastOrderAt: toNullableIsoDate(input?.lastOrderAt),
  };
}

export function mapCustomerListItem(
  contact: CustomerListContactRecord,
  metrics?: CustomerMetrics,
): CustomerListItem {
  const resolvedMetrics = metrics ?? mapCustomerMetrics();

  return {
    id: contact.id,
    displayName: contact.displayName,
    externalId: contact.externalId,
    primaryChannel: contact.primaryChannel,
    customerStatus: contact.customerStatus,
    totalOrders: resolvedMetrics.totalOrders,
    totalSpentCrc: resolvedMetrics.totalSpentCrc,
    lastOrderAt: resolvedMetrics.lastOrderAt,
    createdAt: contact.createdAt.toISOString(),
  };
}

export function mapCustomerOrderSummary(order: OrderRecord): CustomerOrderSummary {
  return {
    id: order.id,
    status: order.status,
    totalCrc: order.totalCrc,
    createdAt: order.createdAt.toISOString(),
  };
}

export function mapCustomerConversationSummary(thread: ThreadRecord): CustomerConversationSummary {
  return {
    id: thread.id,
    leadThreadKey: thread.leadThreadKey,
    leadStage: thread.leadStage,
    updatedAt: thread.updatedAt.toISOString(),
    lastMessagePreview: thread.messages[0]?.text ?? null,
    messageCount: thread._count.messages,
  };
}

export function mapCustomerDetail(input: {
  contact: CustomerDetailContactRecord;
  metrics: CustomerMetrics;
  orders: OrderRecord[];
  conversations: ThreadRecord[];
}): CustomerDetail {
  return {
    id: input.contact.id,
    displayName: input.contact.displayName,
    externalId: input.contact.externalId,
    primaryChannel: input.contact.primaryChannel,
    customerStatus: input.contact.customerStatus,
    metrics: input.metrics,
    createdAt: input.contact.createdAt.toISOString(),
    updatedAt: input.contact.updatedAt.toISOString(),
    tags: mapCustomerTags(input.contact.tags),
    orders: input.orders.map(mapCustomerOrderSummary),
    conversations: input.conversations.map(mapCustomerConversationSummary),
  };
}

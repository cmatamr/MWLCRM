import type { OrderStatusEnum } from "@prisma/client";

import type { ListCampaignsParams } from "@/server/services/campaigns/types";
import type { ListConversationsParams } from "@/server/services/conversations/types";
import type { ListCustomersParams } from "@/server/services/customers/types";
import type { DashboardDailySalesRangeDays } from "@/server/services/dashboard/types";
import type { ListOrdersParams } from "@/server/services/orders/types";

function normalizeQueryKeyParams<TParams extends object | undefined>(params?: TParams) {
  return Object.fromEntries(
    Object.entries((params ?? {}) as Record<string, unknown>)
      .filter(([, value]) => value != null && value !== "")
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey)),
  ) as TParams extends undefined ? Record<string, never> : Partial<NonNullable<TParams>>;
}

export const queryEndpoints = {
  dashboard: "/api/dashboard/summary",
  orders: "/api/orders",
  customers: "/api/customers",
  campaigns: "/api/campaigns",
  funnel: "/api/funnel/summary",
  conversations: "/api/conversations",
} as const;

export const queryRefetchIntervals = {
  dashboard: 30000,
  orders: 20000,
  customers: 60000,
  campaigns: 60000,
  funnel: 20000,
  conversations: 8000,
} as const;

export const queryKeys = {
  dashboardSummary: (params?: { days?: DashboardDailySalesRangeDays; status?: OrderStatusEnum }) =>
    ["dashboard", "summary", normalizeQueryKeyParams(params)] as const,
  orderDetail: (id: string | null) => ["orders", "detail", id] as const,
  orders: (params?: ListOrdersParams) => ["orders", normalizeQueryKeyParams(params)] as const,
  customers: (params?: ListCustomersParams) => ["customers", normalizeQueryKeyParams(params)] as const,
  campaigns: (params?: ListCampaignsParams) => ["campaigns", normalizeQueryKeyParams(params)] as const,
  funnelSummary: () => ["funnel", "summary"] as const,
  conversationDetail: (id: string | null) => ["conversations", "detail", id] as const,
  conversations: (params?: ListConversationsParams) =>
    ["conversations", normalizeQueryKeyParams(params)] as const,
} as const;

import type { OrderStatusEnum } from "@prisma/client";

import type { ListCampaignsParams } from "@/server/services/campaigns/types";
import type { ListConversationsParams } from "@/server/services/conversations/types";
import type { ListCustomersParams } from "@/server/services/customers/types";
import type { DashboardDailySalesRangeDays } from "@/server/services/dashboard/types";
import type { FunnelSummaryParams } from "@/server/services/funnel/types";
import type { ListOrdersParams } from "@/server/services/orders/types";
import type {
  GetProductsPerformanceParams,
  ListCatalogProductsParams,
} from "@/server/services/products";
import type { ListPromotionsParams } from "@/server/services/promotions";

function normalizeQueryKeyParams<TParams extends object | undefined>(params?: TParams) {
  return Object.fromEntries(
    Object.entries((params ?? {}) as Record<string, unknown>)
      .filter(([, value]) => value != null && value !== "")
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey)),
  ) as TParams extends undefined ? Record<string, never> : Partial<NonNullable<TParams>>;
}

export const queryEndpoints = {
  banks: "/api/banks",
  dashboard: "/api/dashboard/summary",
  orders: "/api/orders",
  customers: "/api/customers",
  campaigns: "/api/campaigns",
  funnel: "/api/funnel/summary",
  conversations: "/api/conversations",
  products: "/api/products",
  productsPerformance: "/api/products/performance",
  promotions: "/api/promotions",
} as const;

export const queryRefetchIntervals = {
  banks: 300000,
  dashboard: 30000,
  orders: 20000,
  orderDetail: 20000,
  customers: 60000,
  campaigns: 60000,
  funnel: 20000,
  conversations: 8000,
  products: 30000,
  productsPerformance: 30000,
  productDetail: 30000,
  promotions: 30000,
  promotionDetail: 30000,
} as const;

export const queryKeys = {
  banks: () => ["banks"] as const,
  dashboardSummary: (params?: { days?: DashboardDailySalesRangeDays; status?: OrderStatusEnum }) =>
    ["dashboard", "summary", normalizeQueryKeyParams(params)] as const,
  orderDetail: (id: string | null) => ["orders", "detail", id] as const,
  orderCatalogProductOptions: (query?: string, qty?: number, exactProductId?: string) =>
    [
      "orders",
      "catalog-product-options",
      normalizeQueryKeyParams({ query, qty, exactProductId }),
    ] as const,
  orderItemProductOptions: (
    orderId: string | null,
    query?: string,
    qty?: number,
    exactProductId?: string,
  ) =>
    [
      "orders",
      "detail",
      orderId,
      "item-product-options",
      normalizeQueryKeyParams({ query, qty, exactProductId }),
    ] as const,
  orders: (params?: ListOrdersParams) => ["orders", normalizeQueryKeyParams(params)] as const,
  customers: (params?: ListCustomersParams) => ["customers", normalizeQueryKeyParams(params)] as const,
  campaigns: (params?: ListCampaignsParams) => ["campaigns", normalizeQueryKeyParams(params)] as const,
  funnelSummary: (params?: FunnelSummaryParams) =>
    ["funnel", "summary", normalizeQueryKeyParams(params)] as const,
  conversationDetail: (id: string | null) => ["conversations", "detail", id] as const,
  conversations: (params?: ListConversationsParams) =>
    ["conversations", normalizeQueryKeyParams(params)] as const,
  products: (params?: ListCatalogProductsParams) =>
    ["products", normalizeQueryKeyParams(params)] as const,
  productsPerformance: (params: GetProductsPerformanceParams) =>
    ["products", "performance", normalizeQueryKeyParams(params)] as const,
  productDetail: (id: string | null) => ["products", "detail", id] as const,
  promotions: (params?: ListPromotionsParams) =>
    ["promotions", normalizeQueryKeyParams(params)] as const,
  promotionDetail: (id: string | null) => ["promotions", "detail", id] as const,
} as const;

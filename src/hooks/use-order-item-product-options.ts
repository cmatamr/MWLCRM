"use client";

import { useQuery } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys } from "@/lib/query-config";
import type { OrderItemProductOption } from "@/server/services/orders/types";

export function useOrderItemProductOptions(orderId: string | null, query: string, enabled: boolean) {
  return useQuery<OrderItemProductOption[], FetcherError>({
    queryKey: orderId
      ? queryKeys.orderItemProductOptions(orderId, query)
      : queryKeys.orderCatalogProductOptions(query),
    queryFn: () =>
      orderId
        ? crmApiClient.getOrderItemProductOptions(orderId, query)
        : crmApiClient.listOrderCatalogProductOptions(query),
    enabled,
    staleTime: 30_000,
  });
}

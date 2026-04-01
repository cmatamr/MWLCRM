"use client";

import { useQuery } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys } from "@/lib/query-config";
import type { OrderItemProductOption } from "@/server/services/orders/types";

export function useOrderItemProductOptions(orderId: string, query: string, enabled: boolean) {
  return useQuery<OrderItemProductOption[], FetcherError>({
    queryKey: queryKeys.orderItemProductOptions(orderId, query),
    queryFn: () => crmApiClient.getOrderItemProductOptions(orderId, query),
    enabled,
    staleTime: 30_000,
  });
}

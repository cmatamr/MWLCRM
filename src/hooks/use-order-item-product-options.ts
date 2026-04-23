"use client";

import { useQuery } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys } from "@/lib/query-config";
import type { OrderItemProductOption } from "@/server/services/orders/types";

export function useOrderItemProductOptions(
  orderId: string | null,
  input: { query: string; qty?: number; exactProductId?: string },
  enabled: boolean,
) {
  return useQuery<OrderItemProductOption[], FetcherError>({
    queryKey: orderId
      ? queryKeys.orderItemProductOptions(orderId, input.query, input.qty, input.exactProductId)
      : queryKeys.orderCatalogProductOptions(input.query, input.qty, input.exactProductId),
    queryFn: () =>
      orderId
        ? crmApiClient.getOrderItemProductOptions(orderId, {
            query: input.query,
            qty: input.qty,
            exactProductId: input.exactProductId,
          })
        : crmApiClient.listOrderCatalogProductOptions({
            query: input.query,
            qty: input.qty,
            exactProductId: input.exactProductId,
          }),
    enabled,
    staleTime: 30_000,
  });
}

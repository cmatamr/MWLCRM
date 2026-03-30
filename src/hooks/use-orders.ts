"use client";

import { useQuery } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys, queryRefetchIntervals } from "@/lib/query-config";
import type { ListOrdersParams, OrdersListResponse } from "@/server/services/orders/types";

export function useOrders(params?: ListOrdersParams) {
  const query = useQuery<OrdersListResponse, FetcherError>({
    queryKey: queryKeys.orders(params),
    queryFn: () => crmApiClient.listOrders(params),
    refetchInterval: queryRefetchIntervals.orders,
    refetchIntervalInBackground: false,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

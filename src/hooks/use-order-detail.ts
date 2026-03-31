"use client";

import { useQuery } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys, queryRefetchIntervals } from "@/lib/query-config";
import type { OrderDetail } from "@/server/services/orders/types";

export function useOrderDetail(id: string, initialData?: OrderDetail) {
  const query = useQuery<OrderDetail, FetcherError>({
    queryKey: queryKeys.orderDetail(id),
    queryFn: () => crmApiClient.getOrder(id),
    initialData,
    refetchInterval: queryRefetchIntervals.orderDetail,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

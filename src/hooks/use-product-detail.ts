"use client";

import { useQuery } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys, queryRefetchIntervals } from "@/lib/query-config";
import type { ProductDetail } from "@/server/services/products";

export function useProductDetail(id: string | null) {
  const query = useQuery<ProductDetail, FetcherError>({
    queryKey: queryKeys.productDetail(id),
    queryFn: () => crmApiClient.getProductDetail(id ?? ""),
    enabled: Boolean(id),
    refetchInterval: queryRefetchIntervals.productDetail,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
  };
}

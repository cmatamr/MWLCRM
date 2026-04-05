"use client";

import { useQuery } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys, queryRefetchIntervals } from "@/lib/query-config";
import type {
  GetProductsPerformanceParams,
  ProductsPerformanceResponse,
} from "@/server/services/products";

export function useProductsPerformance(params: GetProductsPerformanceParams) {
  const query = useQuery<ProductsPerformanceResponse, FetcherError>({
    queryKey: queryKeys.productsPerformance(params),
    queryFn: () => crmApiClient.getProductsPerformance(params),
    placeholderData: (previousData) => previousData,
    refetchInterval: queryRefetchIntervals.productsPerformance,
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

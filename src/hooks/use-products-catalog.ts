"use client";

import { useQuery } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys, queryRefetchIntervals } from "@/lib/query-config";
import type { ListCatalogProductsParams, ProductsCatalogResponse } from "@/server/services/products";

export function useProductsCatalog(params?: ListCatalogProductsParams) {
  const query = useQuery<ProductsCatalogResponse, FetcherError>({
    queryKey: queryKeys.products(params),
    queryFn: () => crmApiClient.listProductsCatalog(params),
    refetchInterval: queryRefetchIntervals.products,
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

"use client";

import { useQuery } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys, queryRefetchIntervals } from "@/lib/query-config";
import type { CustomersListResponse, ListCustomersParams } from "@/server/services/customers/types";

export function useCustomers(params?: ListCustomersParams) {
  const query = useQuery<CustomersListResponse, FetcherError>({
    queryKey: queryKeys.customers(params),
    queryFn: () => crmApiClient.listCustomers(params),
    refetchInterval: queryRefetchIntervals.customers,
    refetchIntervalInBackground: false,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

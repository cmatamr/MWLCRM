"use client";

import { useQuery } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys, queryRefetchIntervals } from "@/lib/query-config";
import type { BankListItem } from "@/server/services/orders/types";

export function useBanks() {
  const query = useQuery<BankListItem[], FetcherError>({
    queryKey: queryKeys.banks(),
    queryFn: () => crmApiClient.listBanks(),
    refetchInterval: queryRefetchIntervals.banks,
    refetchIntervalInBackground: false,
    staleTime: queryRefetchIntervals.banks,
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

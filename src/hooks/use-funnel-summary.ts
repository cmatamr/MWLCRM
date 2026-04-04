"use client";

import { useQuery } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys, queryRefetchIntervals } from "@/lib/query-config";
import type { FunnelSummary, FunnelSummaryParams } from "@/server/services/funnel/types";

export function useFunnelSummary(params?: FunnelSummaryParams) {
  const query = useQuery<FunnelSummary, FetcherError>({
    queryKey: queryKeys.funnelSummary(params),
    queryFn: () => crmApiClient.getFunnelSummary(params),
    refetchInterval: queryRefetchIntervals.funnel,
    refetchIntervalInBackground: false,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

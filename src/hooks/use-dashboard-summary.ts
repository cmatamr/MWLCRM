"use client";

import { useQuery } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys, queryRefetchIntervals } from "@/lib/query-config";
import type { DashboardSummary } from "@/server/services/dashboard/types";

export function useDashboardSummary() {
  const query = useQuery<DashboardSummary, FetcherError>({
    queryKey: queryKeys.dashboardSummary(),
    queryFn: () => crmApiClient.getDashboardSummary(),
    refetchInterval: queryRefetchIntervals.dashboard,
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

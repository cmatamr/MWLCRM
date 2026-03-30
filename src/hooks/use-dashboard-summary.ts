"use client";

import { useQuery } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys, queryRefetchIntervals } from "@/lib/query-config";
import type {
  DashboardDailySalesRangeDays,
  DashboardSummary,
} from "@/server/services/dashboard/types";

export function useDashboardSummary(days: DashboardDailySalesRangeDays) {
  const query = useQuery<DashboardSummary, FetcherError>({
    queryKey: queryKeys.dashboardSummary({ days }),
    queryFn: () => crmApiClient.getDashboardSummary({ days }),
    placeholderData: (previousData) => previousData,
    refetchInterval: queryRefetchIntervals.dashboard,
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

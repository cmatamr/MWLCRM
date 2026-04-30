"use client";

import { useQuery } from "@tanstack/react-query";
import type { OrderStatusEnum } from "@prisma/client";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys, queryRefetchIntervals } from "@/lib/query-config";
import type {
  DashboardDailySalesRangeDays,
  DashboardSummary,
} from "@/server/services/dashboard/types";

export function useDashboardSummary(days: DashboardDailySalesRangeDays) {
  return useDashboardSummaryWithStatus(days);
}

export function useDashboardSummaryWithStatus(
  days: DashboardDailySalesRangeDays,
  status?: OrderStatusEnum,
) {
  const query = useQuery<DashboardSummary, FetcherError>({
    queryKey: queryKeys.dashboardSummary({ days, status }),
    queryFn: () => crmApiClient.getDashboardSummary({ days, status }),
    placeholderData: (previousData) => previousData,
    refetchInterval: queryRefetchIntervals.salesDashboard,
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

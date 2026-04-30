"use client";

import { useQuery } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys, queryRefetchIntervals } from "@/lib/query-config";
import type { CampaignsListResponse, ListCampaignsParams } from "@/server/services/campaigns/types";

export function useCampaigns(params?: ListCampaignsParams) {
  const query = useQuery<CampaignsListResponse, FetcherError>({
    queryKey: queryKeys.campaigns(params),
    queryFn: () => crmApiClient.listCampaigns(params),
    refetchInterval: queryRefetchIntervals.campaignsDashboard,
    refetchIntervalInBackground: false,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

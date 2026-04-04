"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import { FetcherError } from "@/lib/fetcher";
import { queryKeys } from "@/lib/query-config";
import type { ListCampaignsParams } from "@/server/services/campaigns/types";
import type { CampaignSyncResult } from "@/server/services/meta-campaign-sync";

export function useSyncCampaigns(params?: ListCampaignsParams) {
  const queryClient = useQueryClient();

  return useMutation<CampaignSyncResult, FetcherError>({
    mutationFn: async () => {
      try {
        return await crmApiClient.syncCampaigns();
      } catch (error) {
        if (error instanceof FetcherError) {
          throw error;
        }

        throw new FetcherError({
          status: 500,
          code: "CAMPAIGN_SYNC_FAILED",
          message: "No se pudo completar la sincronización de campañas.",
          details: error,
        });
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.campaigns(params),
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["campaigns"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["dashboard", "summary"],
          refetchType: "active",
        }),
      ]);
    },
  });
}

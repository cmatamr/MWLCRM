"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys, queryRefetchIntervals } from "@/lib/query-config";
import type { AiDashboardSummary } from "@/server/services/ai-dashboard";

export function useAiDashboardSummary(clientCode: string) {
  return useQuery<AiDashboardSummary, FetcherError>({
    queryKey: queryKeys.aiDashboardSummary(clientCode),
    queryFn: () => crmApiClient.getAiDashboardSummary(clientCode),
    refetchInterval: queryRefetchIntervals.aiDashboard,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

export function useToggleClientAgent(clientCode: string, agentCode: string) {
  const queryClient = useQueryClient();

  return useMutation<{ enabled: boolean }, FetcherError, boolean>({
    mutationFn: (enabled) => crmApiClient.toggleClientAgent(clientCode, agentCode, enabled),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.aiDashboardSummary(clientCode),
      });
    },
  });
}

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

export function useUpsertOpenAIProviderProject(clientCode: string) {
  const queryClient = useQueryClient();

  return useMutation<
    {
      clientCode: string;
      provider: "openai";
      providerProjectId: string;
      providerProjectName: string;
      monthlyBudgetUsd: number;
      status: "active" | "inactive" | "suspended" | "revoked";
      configured: true;
      operation: "created" | "updated";
    },
    FetcherError,
    {
      provider: "openai";
      providerProjectId: string;
      providerProjectName: string;
      monthlyBudgetUsd: number;
      status: "active" | "inactive" | "suspended" | "revoked";
    }
  >({
    mutationFn: (input) => crmApiClient.upsertOpenAIProviderProject(clientCode, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.aiDashboardSummary(clientCode),
      });
    },
  });
}

export function useSyncOpenAICosts(clientCode: string) {
  const queryClient = useQueryClient();

  return useMutation<
    {
      clientCode: string;
      provider: "openai";
      providerProjectId: string;
      providerProjectName: string;
      periodStart: string;
      periodEnd: string;
      internalRecordedCostUsd: number;
      providerReportedCostUsd: number;
      differenceUsd: number;
      status: "pending" | "matched" | "mismatch" | "reviewed";
    },
    FetcherError,
    { periodStart: string; periodEnd: string }
  >({
    mutationFn: ({ periodStart, periodEnd }) =>
      crmApiClient.syncOpenAICosts({ clientCode, periodStart, periodEnd }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.aiDashboardSummary(clientCode),
      });
    },
  });
}

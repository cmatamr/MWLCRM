"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys, queryRefetchIntervals } from "@/lib/query-config";
import type {
  ListPromotionsParams,
  PromotionDetail,
  PromotionsListResponse,
  SavePromotionInput,
} from "@/server/services/promotions";

export function usePromotions(params?: ListPromotionsParams) {
  const query = useQuery<PromotionsListResponse, FetcherError>({
    queryKey: queryKeys.promotions(params),
    queryFn: () => crmApiClient.listPromotions(params),
    refetchInterval: queryRefetchIntervals.promotions,
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

export function usePromotionDetail(id: string | null) {
  const query = useQuery<PromotionDetail, FetcherError>({
    queryKey: queryKeys.promotionDetail(id),
    queryFn: () => crmApiClient.getPromotion(id as string),
    enabled: Boolean(id),
    refetchInterval: queryRefetchIntervals.promotionDetail,
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

export function usePromotionMutations() {
  const queryClient = useQueryClient();

  const saveMutation = useMutation<
    PromotionDetail,
    FetcherError,
    { id?: string; input: SavePromotionInput }
  >({
    mutationFn: ({ id, input }) =>
      id ? crmApiClient.updatePromotion(id, input) : crmApiClient.createPromotion(input),
    onSuccess: async (result) => {
      queryClient.setQueryData(queryKeys.promotionDetail(result.id), result);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["promotions"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.promotionDetail(result.id) }),
      ]);
    },
  });

  const toggleMutation = useMutation<PromotionDetail, FetcherError, { id: string; isEnabled: boolean }>({
    mutationFn: ({ id, isEnabled }) => crmApiClient.togglePromotion(id, isEnabled),
    onSuccess: async (result) => {
      queryClient.setQueryData(queryKeys.promotionDetail(result.id), result);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["promotions"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.promotionDetail(result.id) }),
      ]);
    },
  });

  const duplicateMutation = useMutation<PromotionDetail, FetcherError, { id: string }>({
    mutationFn: ({ id }) => crmApiClient.duplicatePromotion(id),
    onSuccess: async (result) => {
      queryClient.setQueryData(queryKeys.promotionDetail(result.id), result);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["promotions"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.promotionDetail(result.id) }),
      ]);
    },
  });

  const deleteMutation = useMutation<{ deleted: true; id: string }, FetcherError, { id: string }>({
    mutationFn: ({ id }) => crmApiClient.deletePromotion(id),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["promotions"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.promotionDetail(variables.id) }),
      ]);
    },
  });

  return {
    savePromotion: saveMutation.mutateAsync,
    togglePromotion: toggleMutation.mutateAsync,
    duplicatePromotion: duplicateMutation.mutateAsync,
    deletePromotion: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isToggling: toggleMutation.isPending,
    isDuplicating: duplicateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

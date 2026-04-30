"use client";

import { useQuery } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys, queryRefetchIntervals } from "@/lib/query-config";
import type {
  ConversationsListResponse,
  ListConversationsParams,
} from "@/server/services/conversations/types";

export function useConversations(params?: ListConversationsParams) {
  const query = useQuery<ConversationsListResponse, FetcherError>({
    queryKey: queryKeys.conversations(params),
    queryFn: () => crmApiClient.listConversations(params),
    refetchInterval: queryRefetchIntervals.conversationsDashboard,
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

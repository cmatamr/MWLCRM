"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys } from "@/lib/query-config";
import type { DeleteOrderResult } from "@/server/services/orders/types";

export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation<DeleteOrderResult, FetcherError, string>({
    mutationFn: (orderId) => crmApiClient.deleteOrder(orderId),
    onSuccess: async (result) => {
      queryClient.removeQueries({
        queryKey: queryKeys.orderDetail(result.id),
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["dashboard", "summary"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["orders"],
          refetchType: "active",
        }),
      ]);
    },
  });
}

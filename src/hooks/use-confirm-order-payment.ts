"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys } from "@/lib/query-config";
import type { OrderPaymentConfirmationResult } from "@/server/services/orders/types";

export function useConfirmOrderPayment() {
  const queryClient = useQueryClient();

  return useMutation<OrderPaymentConfirmationResult, FetcherError, string>({
    mutationFn: (orderId) => crmApiClient.confirmOrderPayment(orderId),
    onSuccess: async (_result, orderId) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["dashboard", "summary"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["orders"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.orderDetail(orderId),
          refetchType: "active",
        }),
      ]);
    },
  });
}

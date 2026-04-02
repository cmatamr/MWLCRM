"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys } from "@/lib/query-config";
import type { OrderDetail, PaymentReceiptReviewActionInput } from "@/server/services/orders/types";

type CancelPaymentReceiptMutationInput = {
  receiptId: string;
  input: PaymentReceiptReviewActionInput;
};

export function useCancelPaymentReceipt(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation<OrderDetail, FetcherError, CancelPaymentReceiptMutationInput>({
    mutationFn: ({ receiptId, input }) => crmApiClient.cancelPaymentReceipt(orderId, receiptId, input),
    onSuccess: async (order) => {
      queryClient.setQueryData(queryKeys.orderDetail(orderId), order);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: ["orders"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: queryKeys.orderDetail(orderId), refetchType: "active" }),
      ]);
    },
  });
}

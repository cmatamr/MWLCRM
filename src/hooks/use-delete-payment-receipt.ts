"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys } from "@/lib/query-config";
import type { OrderDetail, PaymentReceiptReviewActionInput } from "@/server/services/orders/types";

type DeletePaymentReceiptMutationInput = {
  receiptId: string;
  input: PaymentReceiptReviewActionInput;
};

export function useDeletePaymentReceipt(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation<OrderDetail, FetcherError, DeletePaymentReceiptMutationInput>({
    mutationFn: ({ receiptId, input }) => crmApiClient.deletePaymentReceipt(orderId, receiptId, input),
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

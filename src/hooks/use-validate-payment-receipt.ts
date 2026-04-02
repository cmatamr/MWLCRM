"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys } from "@/lib/query-config";
import type { OrderDetail } from "@/server/services/orders/types";

type ValidatePaymentReceiptInput = {
  receiptId: string;
  performedBy: string;
  internalNotes?: string | null;
};

export function useValidatePaymentReceipt(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation<OrderDetail, FetcherError, ValidatePaymentReceiptInput>({
    mutationFn: ({ receiptId, performedBy, internalNotes }) =>
      crmApiClient.validatePaymentReceipt(orderId, receiptId, {
        performedBy,
        internalNotes,
      }),
    onSuccess: async (order) => {
      queryClient.setQueryData(queryKeys.orderDetail(orderId), order);

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

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys } from "@/lib/query-config";
import type { OrderDetail } from "@/server/services/orders/types";

type CreateOrderItemInput = {
  productId: string;
  quantity: number;
};

export function useCreateOrderItem(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation<OrderDetail, FetcherError, CreateOrderItemInput>({
    mutationFn: ({ productId, quantity }) => crmApiClient.createOrderItem(orderId, productId, quantity),
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
        queryClient.invalidateQueries({
          queryKey: queryKeys.orderItemProductOptions(orderId),
          refetchType: "active",
        }),
      ]);
    },
  });
}

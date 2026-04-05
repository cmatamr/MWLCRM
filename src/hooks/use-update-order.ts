"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys } from "@/lib/query-config";
import type { OrderDetail, UpdateOrderInput } from "@/server/services/orders/types";

type UpdateOrderMutationInput = {
  orderId: string;
  input: UpdateOrderInput;
};

export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation<OrderDetail, FetcherError, UpdateOrderMutationInput>({
    mutationFn: ({ orderId, input }) => crmApiClient.updateOrder(orderId, input),
    onSuccess: async (order) => {
      queryClient.setQueryData(queryKeys.orderDetail(order.id), order);

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
          queryKey: queryKeys.orderDetail(order.id),
          refetchType: "active",
        }),
      ]);
    },
  });
}

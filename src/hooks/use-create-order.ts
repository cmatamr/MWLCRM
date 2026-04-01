"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys } from "@/lib/query-config";
import type { CreateOrderInput, OrderDetail } from "@/server/services/orders/types";

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation<OrderDetail, FetcherError, CreateOrderInput>({
    mutationFn: (input) => crmApiClient.createOrder(input),
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
      ]);
    },
  });
}

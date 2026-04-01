"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys } from "@/lib/query-config";
import type { OrderDetail } from "@/server/services/orders/types";

type UpdateOrderDeliveryDateInput = {
  orderId: string;
  deliveryDate: string | null;
};

export function useUpdateOrderDeliveryDate() {
  const queryClient = useQueryClient();

  return useMutation<OrderDetail, FetcherError, UpdateOrderDeliveryDateInput>({
    mutationFn: ({ orderId, deliveryDate }) =>
      crmApiClient.updateOrderDeliveryDate(orderId, deliveryDate),
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

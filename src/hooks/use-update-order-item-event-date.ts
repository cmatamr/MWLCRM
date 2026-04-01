"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys } from "@/lib/query-config";
import type { OrderDetail } from "@/server/services/orders/types";

type UpdateOrderItemDeliveryDateInput = {
  itemId: string;
  deliveryDate: string | null;
};

export function useUpdateOrderItemDeliveryDate(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation<OrderDetail, FetcherError, UpdateOrderItemDeliveryDateInput>({
    mutationFn: ({ itemId, deliveryDate }) =>
      crmApiClient.updateOrderItemDeliveryDate(orderId, itemId, deliveryDate),
    onSuccess: async (order) => {
      queryClient.setQueryData(queryKeys.orderDetail(orderId), order);

      await queryClient.invalidateQueries({
        queryKey: queryKeys.orderDetail(orderId),
        refetchType: "active",
      });
    },
  });
}

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys } from "@/lib/query-config";
import type { OrderDetail } from "@/server/services/orders/types";

type UpdateOrderItemEventDateInput = {
  itemId: string;
  eventDate: string | null;
};

export function useUpdateOrderItemEventDate(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation<OrderDetail, FetcherError, UpdateOrderItemEventDateInput>({
    mutationFn: ({ itemId, eventDate }) =>
      crmApiClient.updateOrderItemEventDate(orderId, itemId, eventDate),
    onSuccess: async (order) => {
      queryClient.setQueryData(queryKeys.orderDetail(orderId), order);

      await queryClient.invalidateQueries({
        queryKey: queryKeys.orderDetail(orderId),
        refetchType: "active",
      });
    },
  });
}

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys } from "@/lib/query-config";
import type { CustomerDetail, UpdateCustomerInput } from "@/server/services/customers/types";

type UpdateCustomerMutationInput = {
  customerId: string;
  input: UpdateCustomerInput;
};

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation<CustomerDetail, FetcherError, UpdateCustomerMutationInput>({
    mutationFn: ({ customerId, input }) => crmApiClient.updateCustomer(customerId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["customers"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboardSummary(),
          refetchType: "none",
        }),
      ]);
    },
  });
}

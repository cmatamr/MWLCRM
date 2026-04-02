"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import { queryKeys } from "@/lib/query-config";
import type { CreateCustomerInput, CustomerListItem } from "@/server/services/customers/types";

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation<CustomerListItem, FetcherError, CreateCustomerInput>({
    mutationFn: (input) => crmApiClient.createCustomer(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["customers"],
        refetchType: "active",
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardSummary(),
        refetchType: "none",
      });
    },
  });
}

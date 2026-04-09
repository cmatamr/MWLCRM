"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import { queryKeys } from "@/lib/query-config";
import type { FetcherError } from "@/lib/fetcher";
import type { SaveProductInput, SaveProductResult } from "@/server/services/products";

export function useSaveProduct() {
  const queryClient = useQueryClient();

  const mutation = useMutation<SaveProductResult, FetcherError, { input: SaveProductInput }>({
    mutationFn: ({ input }) => crmApiClient.saveProduct(input),
    onSuccess: async (result) => {
      queryClient.setQueryData(queryKeys.productDetail(result.product.id), result.product);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.productDetail(result.product.id) }),
      ]);
    },
  });

  return {
    saveProduct: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

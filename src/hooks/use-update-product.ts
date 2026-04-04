"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import { queryKeys } from "@/lib/query-config";
import type { FetcherError } from "@/lib/fetcher";
import type { ProductDetail, UpdateProductInput } from "@/server/services/products";

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    ProductDetail,
    FetcherError,
    { id: string; input: UpdateProductInput }
  >({
    mutationFn: ({ id, input }) => crmApiClient.updateProduct(id, input),
    onSuccess: async (updatedProduct, variables) => {
      queryClient.setQueryData(queryKeys.productDetail(variables.id), updatedProduct);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.productDetail(variables.id) }),
      ]);
    },
  });

  return {
    updateProduct: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

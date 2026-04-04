"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import { queryKeys } from "@/lib/query-config";
import type { FetcherError } from "@/lib/fetcher";
import type { CreateProductInput, ProductDetail } from "@/server/services/products";

export function useCreateProduct() {
  const queryClient = useQueryClient();

  const mutation = useMutation<ProductDetail, FetcherError, { input: CreateProductInput }>({
    mutationFn: ({ input }) => crmApiClient.createProduct(input),
    onSuccess: async (createdProduct) => {
      queryClient.setQueryData(queryKeys.productDetail(createdProduct.id), createdProduct);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.productDetail(createdProduct.id) }),
      ]);
    },
  });

  return {
    createProduct: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

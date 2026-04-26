"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import { queryKeys } from "@/lib/query-config";
import type {
  AddProductAliasInput,
  AddProductSearchTermInput,
  ProductDetail,
  UpdateProductImageInput,
  UpdateProductSearchTermInput,
} from "@/server/services/products";

export function useProductSearchMedia() {
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  async function applyWithRefresh(run: () => Promise<ProductDetail>) {
    setIsPending(true);

    try {
      const updatedProduct = await run();
      queryClient.setQueryData(queryKeys.productDetail(updatedProduct.id), updatedProduct);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.productDetail(updatedProduct.id) }),
      ]);

      return updatedProduct;
    } finally {
      setIsPending(false);
    }
  }

  return {
    isPending,
    addImage: (productId: string, input: FormData) =>
      applyWithRefresh(() => crmApiClient.addProductImage(productId, input)),
    updateImage: (productId: string, imageId: number, input: UpdateProductImageInput) =>
      applyWithRefresh(() => crmApiClient.updateProductImage(productId, imageId, input)),
    deleteImage: (productId: string, imageId: number) =>
      applyWithRefresh(() => crmApiClient.deleteProductImage(productId, imageId)),
    addAlias: (productId: string, input: AddProductAliasInput) =>
      applyWithRefresh(() => crmApiClient.addProductAlias(productId, input)),
    deleteAlias: (productId: string, aliasId: number) =>
      applyWithRefresh(() => crmApiClient.deleteProductAlias(productId, aliasId)),
    addSearchTerm: (productId: string, input: AddProductSearchTermInput) =>
      applyWithRefresh(() => crmApiClient.addProductSearchTerm(productId, input)),
    updateSearchTerm: (
      productId: string,
      termId: number,
      input: UpdateProductSearchTermInput,
    ) => applyWithRefresh(() => crmApiClient.updateProductSearchTerm(productId, termId, input)),
    deleteSearchTerm: (productId: string, termId: number) =>
      applyWithRefresh(() => crmApiClient.deleteProductSearchTerm(productId, termId)),
  };
}

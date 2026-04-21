"use client";

import { useQuery } from "@tanstack/react-query";

import { crmApiClient } from "@/lib/api/crm";
import type { FetcherError } from "@/lib/fetcher";
import type { ProductSkuPreviewInput, ProductSkuPreviewResult } from "@/server/services/products";

export function useProductSkuPreview(
  input: ProductSkuPreviewInput,
  enabled: boolean,
) {
  return useQuery<ProductSkuPreviewResult, FetcherError>({
    queryKey: [
      "products",
      "sku-preview",
      input.category.trim(),
      input.family.trim(),
      input.variant_label?.trim() ?? "",
      input.size_label?.trim() ?? "",
      input.material?.trim() ?? "",
    ],
    queryFn: () => crmApiClient.previewProductSku(input),
    enabled,
    retry: false,
    staleTime: 0,
  });
}

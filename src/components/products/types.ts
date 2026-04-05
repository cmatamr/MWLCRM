export type {
  CatalogProductRow,
  ProductDetail,
  ProductDiscountRuleMeta,
  ProductImageMeta,
  ProductPerformanceRow,
  ProductPerformanceTrendPoint,
  ProductPricingMode,
  ProductSearchMeta,
  ProductSearchTermMeta,
  ProductsPerformanceRange,
  ProductsPerformanceResponse,
} from "@/server/services/products";

export type ProductMode = "catalog" | "performance";
export type PerformanceMetric = "units" | "revenue";

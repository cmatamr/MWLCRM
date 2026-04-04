export type {
  CatalogProductRow,
  ProductDetail,
  ProductDiscountRuleMeta,
  ProductImageMeta,
  ProductPricingMode,
  ProductSearchMeta,
  ProductSearchTermMeta,
} from "@/server/services/products";

export type ProductMode = "catalog" | "performance";
export type PerformanceMetric = "units" | "revenue";

export interface ProductPerformanceRow {
  id: string;
  sku: string;
  name: string;
  category: string;
  family: string;
  variant_label: string | null;
  size_label: string | null;
  updated_at: string;
  units_sold_mock: number;
  revenue_crc_mock: number;
  margin_percent_mock: number;
  stock_mock: number | null;
  growth_percent_mock: number;
  commercial_alert_mock: boolean;
}

export interface ProductAnalyticsSummary {
  units_sold_total_mock: number;
  revenue_total_crc_mock: number;
  products_without_sales_mock: number;
  products_with_commercial_alerts_mock: number;
  top_products: Array<{
    product_id: string;
    name: string;
    units_sold_mock: number;
    revenue_crc_mock: number;
  }>;
  sales_trend_mock: Array<{
    label: string;
    units_sold_mock: number;
    revenue_crc_mock: number;
  }>;
  insights_mock: {
    highest_growth_product_id: string | null;
    strongest_drop_product_id: string | null;
    best_margin_product_id: string | null;
    product_without_sales_id: string | null;
  };
}

export interface ProductPerformanceMetricMock {
  product_id: string;
  units_sold_mock: number;
  revenue_crc_mock: number;
  margin_percent_mock: number;
  stock_mock: number | null;
  growth_percent_mock: number;
}

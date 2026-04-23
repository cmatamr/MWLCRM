import type { PaginationMeta, PaginationParams } from "@/domain/crm/common";

export type ProductPricingMode = "fixed" | "range" | "variable";
export type ProductDiscountVisibility =
  | "never"
  | "only_if_customer_requests"
  | "internal_only"
  | "always";
// NOTE(Fase3): term_type remains fixed to "alias" for now because current
// DB data and search-index logic only use/support that value.
export type ProductSearchTermType = "alias";

export interface NovaPublicationValidationResult {
  isNovaReady: boolean;
  blockingIssues: string[];
  warnings: string[];
}

export interface ProductImageMeta {
  id: number;
  product_id: string;
  storage_bucket: string;
  storage_path: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

export interface ProductAliasMeta {
  id: number;
  product_id: string;
  alias: string;
}

export interface ProductSearchTermMeta {
  id: number;
  product_id: string | null;
  family: string | null;
  category: string | null;
  term: string;
  term_type: ProductSearchTermType;
  priority: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export interface ProductDiscountRuleMeta {
  id: number;
  product_id: string;
  min_qty: number;
  discount_percent: number | null;
  discount_amount_crc: number | null;
  rule_type: string;
  notes: string | null;
  is_active: boolean;
}

export interface ProductRangePriceMeta {
  id: number;
  product_id: string;
  range_min_qty: number;
  range_max_qty: number | null;
  unit_price_crc: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export type ProductPricingEngineStatusCode =
  | "manual_required"
  | "min_qty_not_met"
  | "configuration_invalid";

export type ProductPricingResolvedMode =
  | "base"
  | "base_below_promo"
  | "range"
  | "block_exact"
  | "block_round_up"
  | "block_post_top"
  | ProductPricingEngineStatusCode;

export interface ProductPricingEngineStatusHint {
  code: ProductPricingEngineStatusCode;
  message: string;
  reason?: string | null;
  min_qty?: number | null;
}

export type ProductPricingResolutionStatus =
  | "quotable"
  | "manual_required"
  | "min_qty_not_met"
  | "configuration_invalid";

export interface ProductPricingResolution {
  product_id: string;
  qty_requested: number;
  status: ProductPricingResolutionStatus;
  mode: ProductPricingResolvedMode;
  pricing_mode: ProductPricingMode | null;
  unit_price_crc: number | null;
  total_crc: number | null;
  quoted_qty: number | null;
  suggested_qty: number | null;
  min_qty: number | null;
  range_min_qty: number | null;
  range_max_qty: number | null;
  reason: string | null;
  message: string;
  raw: Record<string, unknown>;
}

export interface ProductSearchMeta {
  aliases: string[];
  alias_entries: ProductAliasMeta[];
  search_terms: ProductSearchTermMeta[];
  source_type: string;
  source_ref: string | null;
  search_boost: number;
  storage_bucket: string | null;
  storage_path: string | null;
  alt_text: string | null;
  exact_match: boolean;
  direct_match: boolean;
  match_quality: "exact" | "strong" | "medium" | "weak";
  score: number;
}

export interface CatalogProductRow {
  id: string;
  sku: string;
  name: string;
  category: string;
  family: string;
  variant_label: string | null;
  size_label: string | null;
  pricing_mode: ProductPricingMode;
  price_crc: number | null;
  price_from_crc: number | null;
  min_qty: number | null;
  is_active: boolean;
  is_agent_visible: boolean;
  summary: string | null;
  details: string | null;
  notes: string | null;
  source_type: string;
  source_ref: string | null;
  search_boost: number;
  updated_at: string;
  primary_image_bucket: string | null;
  primary_image_path: string | null;
  primary_image_alt: string | null;
  aliases: string[];
  integrity_alerts: string[];
}

export interface ProductDetail {
  id: string;
  sku: string;
  family: string;
  name: string;
  category: string;
  variant_label: string | null;
  size_label: string | null;
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
  material: string | null;
  base_color: string | null;
  print_type: string | null;
  personalization_area: string | null;
  price_crc: number | null;
  price_from_crc: number | null;
  min_qty: number | null;
  allows_name: boolean;
  includes_design_adjustment_count: number;
  extra_adjustment_has_cost: boolean;
  requires_design_approval: boolean;
  is_full_color: boolean;
  is_premium: boolean;
  is_discountable: boolean;
  discount_visibility: ProductDiscountVisibility;
  pricing_mode: ProductPricingMode;
  summary: string | null;
  details: string | null;
  notes: string | null;
  source_type: string;
  source_ref: string | null;
  is_active: boolean;
  is_agent_visible: boolean;
  sort_order: number;
  updated_at: string;
  search_boost: number;
  images: ProductImageMeta[];
  search_meta: ProductSearchMeta;
  discount_rules: ProductDiscountRuleMeta[];
  range_prices: ProductRangePriceMeta[];
  pricing_engine_hint?: ProductPricingEngineStatusHint | null;
  integrity_alerts?: string[];
  ui_created_locally?: boolean;
}

export interface CatalogKpis {
  activeProducts: number;
  agentVisibleProducts: number;
  withAlerts: number;
  withoutPrimaryImage: number;
}

export interface ProductCatalogFilterOptions {
  categories: string[];
  families: string[];
  variants: string[];
  materials: string[];
  sizes: string[];
}

export interface ListCatalogProductsParams extends PaginationParams {
  search?: string;
  category?: string;
  family?: string;
  isActive?: boolean;
  isAgentVisible?: boolean;
  pricingMode?: ProductPricingMode;
  maxPriceCrc?: number;
  minQty?: number;
  exactProductId?: string;
}

export type ProductsPerformanceRange = "7d" | "30d" | "90d" | "all";

export interface GetProductsPerformanceParams
  extends Omit<ListCatalogProductsParams, "page" | "pageSize"> {
  range: ProductsPerformanceRange;
}

export interface ProductPerformanceTrendPoint {
  bucket_start: string;
  label: string;
  units_sold: number;
  revenue_crc: number;
}

export interface ProductTopPerformanceEntry {
  product_id: string;
  name: string;
  units_sold: number;
  revenue_crc: number;
}

export interface ProductPerformanceInsights {
  top_performer_product_id: string | null;
  highest_growth_product_id: string | null;
  strongest_drop_product_id: string | null;
  product_without_sales_id: string | null;
}

export interface ProductPerformanceRow {
  id: string;
  sku: string;
  name: string;
  category: string;
  family: string;
  variant_label: string | null;
  size_label: string | null;
  updated_at: string;
  is_active: boolean;
  is_agent_visible: boolean;
  units_sold: number;
  revenue_crc: number;
  units_previous_period: number;
  revenue_previous_period: number;
  growth_percent: number | null;
  commercial_alert: boolean;
  margin_percent: number | null;
  stock: number | null;
}

export interface ProductsPerformanceSummary {
  units_sold_total: number;
  revenue_total_crc: number;
  products_without_sales: number;
  products_with_commercial_alerts: number;
}

export interface ProductsPerformanceResponse {
  range: ProductsPerformanceRange;
  date_anchor: "orders.created_at";
  trend_granularity: "day" | "week";
  included_order_statuses: string[];
  excluded_order_statuses: string[];
  margin_available: boolean;
  stock_available: boolean;
  summary: ProductsPerformanceSummary;
  rows: ProductPerformanceRow[];
  top_products: {
    units: ProductTopPerformanceEntry[];
    revenue: ProductTopPerformanceEntry[];
  };
  sales_trend: ProductPerformanceTrendPoint[];
  insights: ProductPerformanceInsights;
}

export interface ProductsCatalogResponse {
  items: CatalogProductRow[];
  pagination: PaginationMeta;
  filters: ProductCatalogFilterOptions;
  kpis: CatalogKpis;
}

export interface UpdateProductInput {
  name?: string;
  category?: string;
  family?: string;
  variant_label?: string | null;
  size_label?: string | null;
  material?: string | null;
  base_color?: string | null;
  print_type?: string | null;
  personalization_area?: string | null;
  summary?: string | null;
  details?: string | null;
  notes?: string | null;
  pricing_mode?: ProductPricingMode;
  price_crc?: number | null;
  price_from_crc?: number | null;
  min_qty?: number | null;
  is_active?: boolean;
  is_agent_visible?: boolean;
  allows_name?: boolean;
  includes_design_adjustment_count?: number;
  extra_adjustment_has_cost?: boolean;
  requires_design_approval?: boolean;
  is_full_color?: boolean;
  is_premium?: boolean;
  is_discountable?: boolean;
  discount_visibility?: ProductDiscountVisibility;
  search_boost?: number;
  sort_order?: number;
}

export interface CreateProductInput {
  name: string;
  category: string;
  family: string;
  pricing_mode: ProductPricingMode;
  price_crc?: number | null;
  price_from_crc?: number | null;
  min_qty: number;
  is_active?: boolean;
  is_agent_visible?: boolean;
  variant_label?: string | null;
  size_label?: string | null;
  material?: string | null;
  base_color?: string | null;
  print_type?: string | null;
  personalization_area?: string | null;
  summary?: string | null;
  details?: string | null;
  notes?: string | null;
  allows_name?: boolean;
  includes_design_adjustment_count?: number;
  extra_adjustment_has_cost?: boolean;
  requires_design_approval?: boolean;
  is_full_color?: boolean;
  is_premium?: boolean;
  is_discountable?: boolean;
  discount_visibility?: ProductDiscountVisibility;
  search_boost?: number;
  sort_order?: number;
}

export interface ProductSkuPreviewInput {
  category: string;
  family: string;
  variant_label?: string | null;
  size_label?: string | null;
  material?: string | null;
}

export interface ProductSkuPreviewResult {
  sku: string;
  base_sku: string;
  id_base: string;
  id_preview: string;
  dictionary_scope_type: "business";
  dictionary_scope_key: "mwl";
}

export interface AddProductImageInput {
  storage_bucket?: string;
  storage_path: string;
  alt_text?: string | null;
  is_primary?: boolean;
  sort_order?: number;
}

export interface UpdateProductImageInput {
  alt_text?: string | null;
  is_primary?: boolean;
  sort_order?: number;
}

export interface AddProductAliasInput {
  alias: string;
}

export interface AddProductSearchTermInput {
  term: string;
  term_type: ProductSearchTermType;
  priority?: number;
  is_active?: boolean;
  notes?: string | null;
}

export interface UpdateProductSearchTermInput {
  term?: string;
  term_type?: ProductSearchTermType;
  priority?: number;
  is_active?: boolean;
  notes?: string | null;
}

export type ProductPublicationMode = "internal" | "nova";

export interface SaveProductAliasInput {
  alias: string;
}

export interface SaveProductSearchTermInput {
  id?: number | null;
  term: string;
  term_type?: ProductSearchTermType;
  priority?: number;
  is_active?: boolean;
  notes?: string | null;
}

export interface SaveProductImageInput {
  id?: number | null;
  storage_bucket?: string;
  storage_path: string;
  alt_text?: string | null;
  is_primary?: boolean;
  sort_order?: number;
}

export interface SaveProductRangePriceInput {
  id?: number | null;
  range_min_qty: number;
  range_max_qty?: number | null;
  unit_price_crc: number;
  sort_order?: number;
  is_active?: boolean;
}

export interface SaveProductInput {
  product_id?: string | null;
  product: CreateProductInput;
  publication_mode: ProductPublicationMode;
  aliases?: SaveProductAliasInput[];
  search_terms?: SaveProductSearchTermInput[];
  images?: SaveProductImageInput[];
  range_prices?: SaveProductRangePriceInput[];
}

export interface SaveProductResult {
  product: ProductDetail;
  save_state:
    | "saved_internal_not_published"
    | "saved_and_published_to_nova"
    | "save_failed_index_refresh";
  publication_mode: ProductPublicationMode;
  index_refresh: {
    attempted: true;
    status: "succeeded" | "failed";
    reason:
      | "product_create"
      | "product_update"
      | "product_save_unified"
      | "product_alias_add"
      | "product_alias_delete"
      | "search_term_add"
      | "search_term_update"
      | "search_term_delete";
  };
}

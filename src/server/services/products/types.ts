import type { PaginationMeta, PaginationParams } from "@/domain/crm/common";

export type ProductPricingMode = "fixed" | "from" | "variable";
export type ProductDiscountVisibility =
  | "never"
  | "only_if_customer_requests"
  | "internal_only"
  | "always";
// NOTE(Fase3): term_type remains fixed to "alias" for now because current
// DB data and search-index logic only use/support that value.
export type ProductSearchTermType = "alias";

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

export interface ProductsCatalogResponse {
  items: CatalogProductRow[];
  pagination: PaginationMeta;
  filters: ProductCatalogFilterOptions;
  kpis: CatalogKpis;
}

export interface UpdateProductInput {
  name?: string;
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

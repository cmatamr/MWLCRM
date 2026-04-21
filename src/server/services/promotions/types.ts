import type { PaginationMeta, PaginationParams } from "@/domain/crm/common";

export type PromoType = "blocks" | "ranges";
export type PromotionVisualStatus =
  | "active_current"
  | "scheduled"
  | "expired"
  | "inactive"
  | "integrity_error";

export interface PromotionBlockPrice {
  id: number;
  promotion_id: string;
  exact_qty: number;
  total_price_crc: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface PromotionRangePrice {
  id: number;
  promotion_id: string;
  range_min_qty: number;
  range_max_qty: number | null;
  unit_price_crc: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface PromotionRow {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  category: string;
  family: string;
  base_price_crc: number | null;
  product_is_active: boolean;
  product_is_agent_visible: boolean;
  name: string;
  promo_type: PromoType;
  is_enabled: boolean;
  agent_visible: boolean;
  starts_at: string;
  ends_at: string;
  timezone_name: string;
  min_promo_qty: number;
  block_size: number | null;
  top_block_qty: number | null;
  post_top_block_price_crc: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  vigente: boolean;
  visual_status: PromotionVisualStatus;
  integrity_issues: string[];
}

export interface PromotionDetail extends PromotionRow {
  block_prices: PromotionBlockPrice[];
  range_prices: PromotionRangePrice[];
  operational_summary: string[];
}

export interface ListPromotionsParams extends PaginationParams {
  search?: string;
  promoType?: PromoType;
  status?: PromotionVisualStatus | "all";
  agentVisible?: boolean;
  isEnabled?: boolean;
}

export interface PromotionsListResponse {
  items: PromotionRow[];
  pagination: PaginationMeta;
}

export interface PromotionBlockPriceInput {
  exact_qty: number;
  total_price_crc: number;
  sort_order?: number;
  is_active?: boolean;
}

export interface PromotionRangePriceInput {
  range_min_qty: number;
  range_max_qty: number | null;
  unit_price_crc: number;
  sort_order?: number;
  is_active?: boolean;
}

export interface SavePromotionInput {
  product_id: string;
  name: string;
  promo_type: PromoType;
  is_enabled: boolean;
  agent_visible: boolean;
  starts_at: string;
  ends_at: string;
  timezone_name: string;
  min_promo_qty: number;
  block_size?: number | null;
  top_block_qty?: number | null;
  post_top_block_price_crc?: number | null;
  notes?: string | null;
  block_prices?: PromotionBlockPriceInput[];
  range_prices?: PromotionRangePriceInput[];
}

export interface TogglePromotionInput {
  is_enabled: boolean;
}

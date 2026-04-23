import { OrderStatusEnum, Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

import { ApiRouteError, badRequest, notFound } from "@/server/api/http";
import {
  isSearchTermUsefulForNova,
  NOVA_SEARCH_TERM_QUALITY_RULE_EN,
} from "@/lib/products/search-term-quality";
import {
  createPaginationMeta,
  normalizePagination,
  resolveDb,
  type ServiceOptions,
} from "@/server/services/shared";

import type {
  AddProductAliasInput,
  AddProductImageInput,
  AddProductSearchTermInput,
  CatalogProductRow,
  CreateProductInput,
  GetProductsPerformanceParams,
  ListCatalogProductsParams,
  NovaPublicationValidationResult,
  ProductAliasMeta,
  ProductDetail,
  ProductDiscountRuleMeta,
  ProductImageMeta,
  ProductPerformanceRow,
  ProductRangePriceMeta,
  ProductPricingResolution,
  ProductSearchTermMeta,
  ProductTopPerformanceEntry,
  ProductPerformanceTrendPoint,
  ProductSkuPreviewInput,
  ProductSkuPreviewResult,
  ProductsPerformanceResponse,
  ProductsCatalogResponse,
  SaveProductAliasInput,
  SaveProductImageInput,
  SaveProductInput,
  SaveProductRangePriceInput,
  SaveProductResult,
  SaveProductSearchTermInput,
  UpdateProductInput,
  UpdateProductImageInput,
  UpdateProductSearchTermInput,
} from "./types";

const PRODUCT_PRICING_MODES = ["fixed", "range", "variable"] as const;
const POSTGRES_INT4_MAX = 2_147_483_647;
const PRODUCT_DEFAULTS = {
  requires_design_approval: true,
  discount_visibility: "only_if_customer_requests",
} as const;

type ProductListRawRow = {
  id: string;
  sku: string;
  family: string;
  name: string;
  category: string;
  variant_label: string | null;
  size_label: string | null;
  pricing_mode: string;
  price_crc: number | null;
  price_from_crc: number | null;
  min_qty: number | null;
  summary: string | null;
  details: string | null;
  notes: string | null;
  source_type: string;
  source_ref: string | null;
  is_active: boolean;
  is_agent_visible: boolean;
  sort_order: number;
  updated_at: Date | string;
  search_boost: number;
  primary_image_bucket: string | null;
  primary_image_path: string | null;
  primary_image_alt: string | null;
  aliases: string[] | null;
};

type ProductDetailRawRow = ProductListRawRow & {
  width_cm: number | string | null;
  height_cm: number | string | null;
  depth_cm: number | string | null;
  allows_name: boolean;
  includes_design_adjustment_count: number;
  extra_adjustment_has_cost: boolean;
  requires_design_approval: boolean;
  is_full_color: boolean;
  is_premium: boolean;
  is_discountable: boolean;
  discount_visibility: "never" | "only_if_customer_requests" | "internal_only" | "always";
  material: string | null;
  base_color: string | null;
  print_type: string | null;
  personalization_area: string | null;
};

type ProductRangePriceRawRow = Omit<ProductRangePriceMeta, "created_at"> & {
  created_at: Date | string;
};

type KpiRawRow = {
  total: bigint | number;
  active_products: bigint | number;
  agent_visible_products: bigint | number;
  with_alerts: bigint | number;
  without_primary_image: bigint | number;
};

type ProductNovaValidationRow = {
  id: string;
  name: string;
  category: string;
  family: string;
  variant_label: string | null;
  summary: string | null;
  pricing_mode: "fixed" | "range" | "variable";
  price_crc: number | null;
  price_from_crc: number | null;
  min_qty: number | null;
  is_active: boolean;
  is_agent_visible: boolean;
  is_discountable: boolean;
  discount_visibility: "never" | "only_if_customer_requests" | "internal_only" | "always";
};

function toIsoString(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

function toNumberOrNull(value: number | string | null | undefined): number | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toCount(value: bigint | number | null | undefined): number {
  if (value == null) {
    return 0;
  }

  return Number(value);
}

function escapeLikePattern(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function normalizeNullableText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeAltText(value: string | null | undefined): string | null | undefined {
  const normalized = normalizeNullableText(value);
  if (normalized != null && normalized.length > 300) {
    throw badRequest("alt_text is too long.", { field: "alt_text", maxLength: 300 });
  }
  return normalized;
}

function normalizeRequiredText(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw badRequest(`${field} cannot be empty.`, { field });
  }
  return trimmed;
}

function normalizeSlugToken(rawValue: string): string {
  const normalized = rawValue
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized;
}

function escapeRegexLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toIsoDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

async function refreshSearchIndexSafely(
  db: ReturnType<typeof resolveDb>,
  context: {
    productId: string;
    reason:
      | "product_create"
      | "product_update"
      | "product_save_unified"
      | "product_alias_add"
      | "product_alias_delete"
      | "search_term_add"
      | "search_term_update"
      | "search_term_delete";
  },
): Promise<{ success: true } | { success: false; error: unknown; message: string }> {
  try {
    await db.$executeRaw(Prisma.sql`SELECT public.mwl_refresh_product_search_index()`);
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "unknown_error";
    console.error("Failed to refresh mwl product search index", {
      ...context,
      error,
    });
    return {
      success: false,
      error,
      message,
    };
  }
}

function throwOnFailedNovaIndexRefresh(input: {
  productId: string;
  reason:
    | "product_create"
    | "product_update"
    | "product_save_unified"
    | "product_alias_add"
    | "product_alias_delete"
    | "search_term_add"
    | "search_term_update"
    | "search_term_delete";
  refresh: { success: false; error: unknown; message: string };
}) {
  throw new ApiRouteError({
    status: 503,
    code: "INDEX_REFRESH_FAILED",
    message:
      "Product save cannot be confirmed as published to NOVA because search index refresh failed.",
    details: {
      product_id: input.productId,
      operation: input.reason,
      save_state: "save_failed_index_refresh",
      publication_mode: "nova",
      index_refresh: {
        attempted: true,
        status: "failed",
        reason: input.reason,
        error_message: input.refresh.message,
      },
    },
  });
}

async function ensureProductExists(
  db: ReturnType<typeof resolveDb>,
  productId: string,
): Promise<void> {
  const [row] = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id
    FROM public.mwl_products
    WHERE id = ${productId}
    LIMIT 1
  `);

  if (!row) {
    throw notFound("Product not found.", { productId });
  }
}

async function getProductNovaValidationRow(
  db: Prisma.TransactionClient | PrismaClient,
  productId: string,
): Promise<ProductNovaValidationRow> {
  const [row] = await db.$queryRaw<ProductNovaValidationRow[]>(Prisma.sql`
    SELECT
      id,
      name,
      category,
      family,
      variant_label,
      summary,
      pricing_mode,
      price_crc,
      price_from_crc,
      min_qty,
      is_active,
      is_agent_visible,
      is_discountable,
      discount_visibility
    FROM public.mwl_products
    WHERE id = ${productId}
    LIMIT 1
  `);

  if (!row) {
    throw notFound("Product not found.", { productId });
  }

  return {
    ...row,
    pricing_mode: normalizePricingMode(row.pricing_mode),
  };
}

async function reindexProductImageSortOrder(
  tx: Prisma.TransactionClient | PrismaClient,
  productId: string,
) {
  await tx.$executeRaw(Prisma.sql`
    WITH ordered AS (
      SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY sort_order ASC, id ASC) - 1 AS next_sort_order
      FROM public.mwl_product_images
      WHERE product_id = ${productId}
    )
    UPDATE public.mwl_product_images i
    SET sort_order = ordered.next_sort_order
    FROM ordered
    WHERE i.id = ordered.id
      AND i.product_id = ${productId}
  `);
}

function hasUsablePrice(input: {
  pricing_mode: string;
  price_crc: number | null;
  price_from_crc: number | null;
}) {
  const isRangeMode = input.pricing_mode === "range";
  return (
    (input.pricing_mode === "fixed" && input.price_crc != null) ||
    (isRangeMode && input.price_from_crc != null) ||
    (input.pricing_mode === "variable" &&
      (input.price_crc != null || input.price_from_crc != null))
  );
}

function hasPricingModeMismatch(input: {
  pricing_mode: string;
  price_crc: number | null;
  price_from_crc: number | null;
}) {
  const isRangeMode = input.pricing_mode === "range";
  return (
    (input.pricing_mode === "fixed" && input.price_crc == null) ||
    (isRangeMode && input.price_from_crc == null)
  );
}

function normalizePricingMode(rawValue: string): (typeof PRODUCT_PRICING_MODES)[number] {
  if (PRODUCT_PRICING_MODES.includes(rawValue as (typeof PRODUCT_PRICING_MODES)[number])) {
    return rawValue as (typeof PRODUCT_PRICING_MODES)[number];
  }

  return "fixed";
}

function getIntegrityAlerts(input: {
  primary_image_bucket: string | null;
  primary_image_path: string | null;
  summary: string | null;
  pricing_mode: string;
  price_crc: number | null;
  price_from_crc: number | null;
}) {
  const alerts: string[] = [];

  if (!input.primary_image_bucket || !input.primary_image_path) {
    alerts.push("Sin imagen primaria");
  }

  if (!input.summary?.trim()) {
    alerts.push("Sin summary");
  }

  if (!hasUsablePrice(input)) {
    alerts.push("Sin precio usable");
  }

  if (hasPricingModeMismatch(input)) {
    alerts.push("pricing_mode inconsistente");
  }

  return alerts;
}

function mapCatalogRow(row: ProductListRawRow): CatalogProductRow {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category,
    family: row.family,
    variant_label: row.variant_label,
    size_label: row.size_label,
    pricing_mode: normalizePricingMode(row.pricing_mode),
    price_crc: row.price_crc,
    price_from_crc: row.price_from_crc,
    min_qty: row.min_qty,
    is_active: row.is_active,
    is_agent_visible: row.is_agent_visible,
    summary: row.summary,
    details: row.details,
    notes: row.notes,
    source_type: row.source_type,
    source_ref: row.source_ref,
    search_boost: row.search_boost,
    updated_at: toIsoString(row.updated_at),
    primary_image_bucket: row.primary_image_bucket,
    primary_image_path: row.primary_image_path,
    primary_image_alt: row.primary_image_alt,
    aliases: row.aliases ?? [],
    integrity_alerts: getIntegrityAlerts(row),
  };
}

function buildBaseWhere(params: ListCatalogProductsParams) {
  const whereParts: Prisma.Sql[] = [];

  if (params.search?.trim()) {
    const escapedSearch = escapeLikePattern(params.search.trim());
    const pattern = `%${escapedSearch}%`;

    whereParts.push(Prisma.sql`
      (
        v.id ILIKE ${pattern} ESCAPE '\\'
        OR v.sku ILIKE ${pattern} ESCAPE '\\'
        OR v.name ILIKE ${pattern} ESCAPE '\\'
        OR v.category ILIKE ${pattern} ESCAPE '\\'
        OR v.family ILIKE ${pattern} ESCAPE '\\'
        OR COALESCE(v.variant_label, '') ILIKE ${pattern} ESCAPE '\\'
        OR COALESCE(v.size_label, '') ILIKE ${pattern} ESCAPE '\\'
        OR COALESCE(v.summary, '') ILIKE ${pattern} ESCAPE '\\'
        OR COALESCE(v.details, '') ILIKE ${pattern} ESCAPE '\\'
        OR COALESCE(v.notes, '') ILIKE ${pattern} ESCAPE '\\'
        OR COALESCE(array_to_string(av.aliases, ' '), '') ILIKE ${pattern} ESCAPE '\\'
      )
    `);
  }

  if (params.category?.trim()) {
    whereParts.push(Prisma.sql`LOWER(v.category) = LOWER(${params.category.trim()})`);
  }

  if (params.family?.trim()) {
    whereParts.push(Prisma.sql`LOWER(v.family) = LOWER(${params.family.trim()})`);
  }

  if (params.isActive != null) {
    whereParts.push(Prisma.sql`v.is_active = ${params.isActive}`);
  }

  if (params.isAgentVisible != null) {
    whereParts.push(Prisma.sql`v.is_agent_visible = ${params.isAgentVisible}`);
  }

  if (params.pricingMode) {
    whereParts.push(Prisma.sql`v.pricing_mode = ${params.pricingMode}`);
  }

  if (params.minQty != null) {
    whereParts.push(Prisma.sql`v.min_qty IS NOT NULL AND v.min_qty >= ${params.minQty}`);
  }

  if (params.maxPriceCrc != null) {
    whereParts.push(Prisma.sql`
      (
        CASE
          WHEN v.pricing_mode = 'fixed' THEN v.price_crc
          WHEN v.pricing_mode = 'range' THEN v.price_from_crc
          ELSE COALESCE(v.price_crc, v.price_from_crc)
        END
      ) IS NOT NULL
      AND (
        CASE
          WHEN v.pricing_mode = 'fixed' THEN v.price_crc
          WHEN v.pricing_mode = 'range' THEN v.price_from_crc
          ELSE COALESCE(v.price_crc, v.price_from_crc)
        END
      ) <= ${params.maxPriceCrc}
    `);
  }

  if (params.exactProductId?.trim()) {
    whereParts.push(Prisma.sql`LOWER(v.id) = LOWER(${params.exactProductId.trim()})`);
  }

  return whereParts.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(whereParts, " AND ")}`
    : Prisma.empty;
}

const baseFrom = Prisma.sql`
  FROM public.mwl_products_with_primary_image v
  LEFT JOIN public.mwl_products p ON p.id = v.id
  LEFT JOIN public.mwl_products_agent_view av ON av.id = v.id
`;

const PERFORMANCE_ALWAYS_INCLUDED_ORDER_STATUSES: OrderStatusEnum[] = [
  OrderStatusEnum.confirmed,
  OrderStatusEnum.ready,
  OrderStatusEnum.shipped,
  OrderStatusEnum.completed,
];

const PERFORMANCE_CONDITIONAL_ORDER_STATUSES: OrderStatusEnum[] = [
  OrderStatusEnum.pending_payment,
  OrderStatusEnum.payment_review,
  OrderStatusEnum.in_design,
  OrderStatusEnum.in_production,
];

const PERFORMANCE_EXCLUDED_ORDER_STATUSES: OrderStatusEnum[] = [
  OrderStatusEnum.draft,
  OrderStatusEnum.quoted,
  OrderStatusEnum.cancelled,
];

const PERFORMANCE_VALID_PAYMENT_STATUS = "validated";

type PerformanceRowRaw = {
  id: string;
  sku: string;
  name: string;
  category: string;
  family: string;
  variant_label: string | null;
  size_label: string | null;
  updated_at: Date | string;
  is_active: boolean;
  is_agent_visible: boolean;
  units_sold: bigint | number | null;
  revenue_crc: bigint | number | null;
  units_previous_period: bigint | number | null;
  revenue_previous_period: bigint | number | null;
};

type PerformanceTrendRaw = {
  bucket_start: Date | string;
  units_sold: bigint | number | null;
  revenue_crc: bigint | number | null;
};

function resolvePerformanceRangeWindow(range: GetProductsPerformanceParams["range"]): {
  range: GetProductsPerformanceParams["range"];
  start: Date | null;
  end: Date;
  previousStart: Date | null;
  previousEnd: Date | null;
  trendGranularity: "day" | "week";
} {
  const end = new Date();

  if (range === "all") {
    return {
      range,
      start: null,
      end,
      previousStart: null,
      previousEnd: null,
      trendGranularity: "week",
    };
  }

  const days = Number.parseInt(range.replace("d", ""), 10);
  const start = new Date(end);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  const previousEnd = new Date(start);
  const previousStart = new Date(start);
  previousStart.setUTCDate(previousStart.getUTCDate() - days);

  return {
    range,
    start,
    end,
    previousStart,
    previousEnd,
    trendGranularity: "day",
  };
}

function getGrowthPercent(currentValue: number, previousValue: number): number | null {
  if (previousValue <= 0) {
    return null;
  }

  return Number((((currentValue - previousValue) / previousValue) * 100).toFixed(2));
}

function formatTrendLabel(input: { bucketStart: Date; granularity: "day" | "week" }): string {
  if (input.granularity === "week") {
    const weekStart = new Date(input.bucketStart);
    const weekEnd = new Date(input.bucketStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    return `${weekStart.toLocaleDateString("es-CR", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    })} - ${weekEnd.toLocaleDateString("es-CR", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    })}`;
  }

  return input.bucketStart.toLocaleDateString("es-CR", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function mapPerformanceRow(row: PerformanceRowRaw): ProductPerformanceRow {
  const unitsSold = toCount(row.units_sold);
  const revenueCrc = toCount(row.revenue_crc);
  const unitsPrevious = toCount(row.units_previous_period);
  const revenuePrevious = toCount(row.revenue_previous_period);
  const growthPercent = getGrowthPercent(unitsSold, unitsPrevious);
  const hasDropAlert = unitsPrevious > 0 && unitsSold < unitsPrevious;
  const hasNoSalesAlert = row.is_active && unitsSold === 0;

  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category,
    family: row.family,
    variant_label: row.variant_label,
    size_label: row.size_label,
    updated_at: toIsoString(row.updated_at),
    is_active: row.is_active,
    is_agent_visible: row.is_agent_visible,
    units_sold: unitsSold,
    revenue_crc: revenueCrc,
    units_previous_period: unitsPrevious,
    revenue_previous_period: revenuePrevious,
    growth_percent: growthPercent,
    commercial_alert: hasNoSalesAlert || hasDropAlert,
    margin_percent: null,
    stock: null,
  };
}

export async function listCatalogProducts(
  params: ListCatalogProductsParams = {},
  options?: ServiceOptions,
): Promise<ProductsCatalogResponse> {
  const db = resolveDb(options);
  const pagination = normalizePagination(params);
  const whereClause = buildBaseWhere(params);

  const [
    rows,
    kpiRows,
    categoryRows,
    familyRows,
    variantRows,
    materialRows,
    sizeRows,
    dictionaryRows,
  ] =
    await Promise.all([
    db.$queryRaw<ProductListRawRow[]>(Prisma.sql`
      SELECT
        v.id,
        v.sku,
        v.family,
        v.name,
        v.category,
        v.variant_label,
        v.size_label,
        v.pricing_mode,
        v.price_crc,
        v.price_from_crc,
        v.min_qty,
        v.summary,
        v.details,
        v.notes,
        v.source_type,
        v.source_ref,
        v.is_active,
        v.is_agent_visible,
        v.sort_order,
        v.updated_at,
        p.search_boost,
        v.primary_image_bucket,
        v.primary_image_path,
        v.primary_image_alt,
        COALESCE(av.aliases, ARRAY[]::text[]) AS aliases
      ${baseFrom}
      ${whereClause}
      ORDER BY v.sort_order ASC, v.name ASC
      LIMIT ${pagination.take} OFFSET ${pagination.skip}
    `),
    db.$queryRaw<KpiRawRow[]>(Prisma.sql`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE v.is_active) AS active_products,
        COUNT(*) FILTER (WHERE v.is_agent_visible) AS agent_visible_products,
        COUNT(*) FILTER (
          WHERE (
            (v.primary_image_bucket IS NULL OR v.primary_image_path IS NULL)
            OR COALESCE(BTRIM(v.summary), '') = ''
            OR NOT (
              (v.pricing_mode = 'fixed' AND v.price_crc IS NOT NULL)
              OR (v.pricing_mode = 'range' AND v.price_from_crc IS NOT NULL)
              OR (v.pricing_mode = 'variable' AND (v.price_crc IS NOT NULL OR v.price_from_crc IS NOT NULL))
            )
            OR (
              (v.pricing_mode = 'fixed' AND v.price_crc IS NULL)
              OR (v.pricing_mode = 'range' AND v.price_from_crc IS NULL)
            )
          )
        ) AS with_alerts,
        COUNT(*) FILTER (
          WHERE (v.primary_image_bucket IS NULL OR v.primary_image_path IS NULL)
        ) AS without_primary_image
      ${baseFrom}
      ${whereClause}
    `),
    db.$queryRaw<Array<{ category: string }>>(Prisma.sql`
      SELECT DISTINCT v.category
      ${baseFrom}
      ${whereClause}
      ORDER BY v.category ASC
    `),
    db.$queryRaw<Array<{ family: string }>>(Prisma.sql`
      SELECT DISTINCT v.family
      ${baseFrom}
      ${whereClause}
      ORDER BY v.family ASC
    `),
    db.$queryRaw<Array<{ variant_label: string }>>(Prisma.sql`
      SELECT DISTINCT q.variant_label
      FROM (
        SELECT v.variant_label
        ${baseFrom}
        ${whereClause}
      ) q
      WHERE q.variant_label IS NOT NULL
        AND COALESCE(BTRIM(q.variant_label), '') <> ''
      ORDER BY q.variant_label ASC
    `),
    db.$queryRaw<Array<{ material: string }>>(Prisma.sql`
      SELECT DISTINCT q.material
      FROM (
        SELECT v.material
        ${baseFrom}
        ${whereClause}
      ) q
      WHERE q.material IS NOT NULL
        AND COALESCE(BTRIM(q.material), '') <> ''
      ORDER BY q.material ASC
    `),
    db.$queryRaw<Array<{ size_label: string }>>(Prisma.sql`
      SELECT DISTINCT q.size_label
      FROM (
        SELECT v.size_label
        ${baseFrom}
        ${whereClause}
      ) q
      WHERE q.size_label IS NOT NULL
        AND COALESCE(BTRIM(q.size_label), '') <> ''
      ORDER BY q.size_label ASC
    `),
    db.$queryRaw<Array<{ dictionary_type: SkuDictionaryType; source_key: string }>>(Prisma.sql`
      SELECT d.dictionary_type::text AS dictionary_type, d.source_key
      FROM public.catalog_sku_code_dictionary d
      WHERE d.scope_type = 'business'
        AND d.scope_key_normalized = 'mwl'
        AND d.is_active = TRUE
        AND d.dictionary_type = ANY(${["category", "family", "variant", "material"]}::text[])
      ORDER BY d.dictionary_type ASC, d.sort_order ASC, d.source_key ASC
    `),
  ]);

  const kpis = kpiRows[0];
  const total = toCount(kpis?.total);

  const dictionaryCategories = dictionaryRows
    .filter((row) => row.dictionary_type === "category")
    .map((row) => row.source_key.trim())
    .filter(Boolean);
  const dictionaryFamilies = dictionaryRows
    .filter((row) => row.dictionary_type === "family")
    .map((row) => row.source_key.trim())
    .filter(Boolean);
  const dictionaryVariants = dictionaryRows
    .filter((row) => row.dictionary_type === "variant")
    .map((row) => row.source_key.trim())
    .filter(Boolean);
  const dictionaryMaterials = dictionaryRows
    .filter((row) => row.dictionary_type === "material")
    .map((row) => row.source_key.trim())
    .filter(Boolean);

  const uniqueSorted = (values: string[]) =>
    Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((left, right) =>
      left.localeCompare(right, "es", { sensitivity: "base" }),
    );

  return {
    items: rows.map(mapCatalogRow),
    pagination: createPaginationMeta({
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    }),
    filters: {
      categories: uniqueSorted([
        ...categoryRows.map((row) => row.category),
        ...dictionaryCategories,
      ]),
      families: uniqueSorted([
        ...familyRows.map((row) => row.family),
        ...dictionaryFamilies,
      ]),
      variants: uniqueSorted([
        ...variantRows.map((row) => row.variant_label),
        ...dictionaryVariants,
      ]),
      materials: uniqueSorted([
        ...materialRows.map((row) => row.material),
        ...dictionaryMaterials,
      ]),
      sizes: uniqueSorted(sizeRows.map((row) => row.size_label)),
    },
    kpis: {
      activeProducts: toCount(kpis?.active_products),
      agentVisibleProducts: toCount(kpis?.agent_visible_products),
      withAlerts: toCount(kpis?.with_alerts),
      withoutPrimaryImage: toCount(kpis?.without_primary_image),
    },
  };
}

export async function getProductDetail(
  productId: string,
  options?: ServiceOptions,
): Promise<ProductDetail> {
  const db = resolveDb(options);

  const [row] = await db.$queryRaw<ProductDetailRawRow[]>(Prisma.sql`
    SELECT
      v.id,
      v.sku,
      v.family,
      v.name,
      v.category,
      v.variant_label,
      v.size_label,
      v.width_cm,
      v.height_cm,
      v.depth_cm,
      v.material,
      v.base_color,
      v.print_type,
      v.personalization_area,
      v.price_crc,
      v.price_from_crc,
      v.min_qty,
      v.allows_name,
      v.includes_design_adjustment_count,
      v.extra_adjustment_has_cost,
      v.requires_design_approval,
      v.is_full_color,
      v.is_premium,
      v.is_discountable,
      v.discount_visibility,
      v.pricing_mode,
      v.summary,
      v.details,
      v.notes,
      v.source_type,
      v.source_ref,
      v.is_active,
      v.is_agent_visible,
      v.sort_order,
      v.updated_at,
      p.search_boost,
      v.primary_image_bucket,
      v.primary_image_path,
      v.primary_image_alt,
      COALESCE(av.aliases, ARRAY[]::text[]) AS aliases
    ${baseFrom}
    WHERE v.id = ${productId}
    LIMIT 1
  `);

  if (!row) {
    throw notFound("Product not found.", { productId });
  }

  const [images, aliases, searchTerms, discountRules, rangePrices] = await Promise.all([
    db.$queryRaw<ProductImageMeta[]>(Prisma.sql`
      SELECT
        id::integer AS id,
        product_id,
        storage_bucket,
        storage_path,
        alt_text,
        is_primary,
        sort_order,
        created_at
      FROM public.mwl_product_images
      WHERE product_id = ${productId}
      ORDER BY is_primary DESC, sort_order ASC, id ASC
    `),
    db.$queryRaw<ProductAliasMeta[]>(Prisma.sql`
      SELECT
        id::integer AS id,
        product_id,
        alias
      FROM public.mwl_product_aliases
      WHERE product_id = ${productId}
      ORDER BY alias ASC, id ASC
    `),
    db.$queryRaw<ProductSearchTermMeta[]>(Prisma.sql`
      SELECT
        id::integer AS id,
        product_id,
        family,
        category,
        term,
        term_type,
        priority,
        is_active,
        notes,
        created_at
      FROM public.mwl_product_search_terms
      WHERE product_id = ${productId}
      ORDER BY priority DESC, term ASC, id ASC
    `),
    db.$queryRaw<ProductDiscountRuleMeta[]>(Prisma.sql`
      SELECT
        id::integer AS id,
        product_id,
        min_qty,
        discount_percent,
        discount_amount_crc,
        rule_type,
        notes,
        is_active
      FROM public.mwl_discount_rules
      WHERE product_id = ${productId}
      ORDER BY min_qty ASC, id ASC
    `),
    db.$queryRaw<ProductRangePriceRawRow[]>(Prisma.sql`
      SELECT
        id::integer AS id,
        product_id,
        range_min_qty,
        range_max_qty,
        unit_price_crc,
        sort_order,
        is_active,
        created_at
      FROM public.mwl_product_range_prices
      WHERE product_id = ${productId}
      ORDER BY range_min_qty ASC, sort_order ASC, id ASC
    `),
  ]);

  const base = mapCatalogRow(row);

  return {
    id: row.id,
    sku: row.sku,
    family: row.family,
    name: row.name,
    category: row.category,
    variant_label: row.variant_label,
    size_label: row.size_label,
    width_cm: toNumberOrNull(row.width_cm),
    height_cm: toNumberOrNull(row.height_cm),
    depth_cm: toNumberOrNull(row.depth_cm),
    material: row.material,
    base_color: row.base_color,
    print_type: row.print_type,
    personalization_area: row.personalization_area,
    price_crc: row.price_crc,
    price_from_crc: row.price_from_crc,
    min_qty: row.min_qty,
    allows_name: row.allows_name,
    includes_design_adjustment_count: row.includes_design_adjustment_count,
    extra_adjustment_has_cost: row.extra_adjustment_has_cost,
    requires_design_approval: row.requires_design_approval,
    is_full_color: row.is_full_color,
    is_premium: row.is_premium,
    is_discountable: row.is_discountable,
    discount_visibility: row.discount_visibility,
    pricing_mode: normalizePricingMode(row.pricing_mode),
    summary: row.summary,
    details: row.details,
    notes: row.notes,
    source_type: row.source_type,
    source_ref: row.source_ref,
    is_active: row.is_active,
    is_agent_visible: row.is_agent_visible,
    sort_order: row.sort_order,
    updated_at: toIsoString(row.updated_at),
    search_boost: row.search_boost,
    images: images.map((image) => ({
      ...image,
      created_at: toIsoString(image.created_at),
    })),
    search_meta: {
      aliases: aliases.map((entry) => entry.alias),
      alias_entries: aliases,
      search_terms: searchTerms.map((term) => ({
        ...term,
        created_at: toIsoDate(term.created_at),
      })),
      source_type: row.source_type,
      source_ref: row.source_ref,
      search_boost: row.search_boost,
      storage_bucket: row.primary_image_bucket,
      storage_path: row.primary_image_path,
      alt_text: row.primary_image_alt,
      exact_match: false,
      direct_match: false,
      match_quality: "weak",
      score: 0,
    },
    discount_rules: discountRules.map((rule) => ({
      ...rule,
      discount_percent: toNumberOrNull(rule.discount_percent),
    })),
    range_prices: rangePrices.map((range) => ({
      ...range,
      created_at: toIsoString(range.created_at),
    })),
    pricing_engine_hint: null,
    integrity_alerts: base.integrity_alerts,
    ui_created_locally: false,
  };
}

const PRICING_RESOLUTION_QUOTABLE_MODES = [
  "base",
  "base_below_promo",
  "range",
  "block_exact",
  "block_round_up",
  "block_post_top",
] as const;

const PRICING_RESOLUTION_ERROR_MODES = [
  "manual_required",
  "min_qty_not_met",
  "configuration_invalid",
] as const;

function toSafeRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function readIntOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readMode(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function buildPricingResolutionMessage(input: {
  mode: string | null;
  minQty: number | null;
  suggestedQty: number | null;
  reason: string | null;
}) {
  if (input.mode === "manual_required") {
    return "Cotizacion manual requerida para este producto.";
  }

  if (input.mode === "min_qty_not_met") {
    if (input.minQty != null) {
      return `La cantidad minima para cotizar este producto es ${input.minQty}.`;
    }

    return "La cantidad solicitada no cumple el minimo requerido.";
  }

  if (input.mode === "configuration_invalid") {
    return "La configuracion de pricing no cubre esta cantidad. Revisar rangos/promociones.";
  }

  if (input.mode === "block_round_up" && input.suggestedQty != null) {
    return `Se cotiza por bloque. Cantidad sugerida: ${input.suggestedQty}.`;
  }

  if (input.mode === "block_post_top") {
    return "Cotizacion aplicada con esquema por bloques sobre el tope promocional.";
  }

  if (input.mode === "base_below_promo") {
    return "La cantidad aun no alcanza el umbral promocional. Se aplica precio base.";
  }

  return "Precio resuelto correctamente.";
}

export async function resolveProductPricing(
  input: { productId: string; qty: number; now?: Date },
  options?: { db?: ReturnType<typeof resolveDb> | Prisma.TransactionClient },
): Promise<ProductPricingResolution> {
  const db = options?.db ?? resolveDb();

  const normalizedQty = Number.isInteger(input.qty) ? input.qty : Number.NaN;
  if (!Number.isInteger(normalizedQty) || normalizedQty < 1) {
    throw badRequest("qty must be an integer greater than or equal to 1.", {
      field: "qty",
      qty: input.qty,
    });
  }

  const [product] = await db.$queryRaw<Array<{ id: string; pricing_mode: string | null }>>(Prisma.sql`
    SELECT id, pricing_mode
    FROM public.mwl_products
    WHERE id = ${input.productId}
    LIMIT 1
  `);

  if (!product) {
    throw notFound("Product not found.", { productId: input.productId });
  }

  const [row] = await db.$queryRaw<Array<{ payload: unknown }>>(Prisma.sql`
    SELECT public.mwl_resolve_product_pricing(
      ${input.productId},
      ${normalizedQty},
      ${input.now ?? new Date()}
    ) AS payload
  `);

  const raw = toSafeRecord(row?.payload);
  const mode = readMode(raw.mode);
  const unitPrice = readIntOrNull(raw.unit_price);
  const total = readIntOrNull(raw.total);
  const quotedQty = readIntOrNull(raw.quoted_qty);
  const suggestedQty = readIntOrNull(raw.suggested_qty);
  const minQty = readIntOrNull(raw.min_qty);
  const rangeMinQty = readIntOrNull(raw.range_min_qty);
  const rangeMaxQty = readIntOrNull(raw.range_max_qty);
  const reason =
    typeof raw.reason === "string" && raw.reason.trim().length > 0 ? raw.reason.trim() : null;

  const isQuotable =
    mode != null &&
    PRICING_RESOLUTION_QUOTABLE_MODES.includes(
      mode as (typeof PRICING_RESOLUTION_QUOTABLE_MODES)[number],
    );
  const isErrorMode =
    mode != null &&
    PRICING_RESOLUTION_ERROR_MODES.includes(mode as (typeof PRICING_RESOLUTION_ERROR_MODES)[number]);

  const status: ProductPricingResolution["status"] = isQuotable
    ? "quotable"
    : isErrorMode
      ? (mode as ProductPricingResolution["status"])
      : "configuration_invalid";

  const normalizedMode: ProductPricingResolution["mode"] = isQuotable || isErrorMode
    ? (mode as ProductPricingResolution["mode"])
    : "configuration_invalid";

  return {
    product_id: input.productId,
    qty_requested: normalizedQty,
    status,
    mode: normalizedMode,
    pricing_mode: product.pricing_mode ? normalizePricingMode(product.pricing_mode) : null,
    unit_price_crc: unitPrice,
    total_crc: total,
    quoted_qty: quotedQty,
    suggested_qty: suggestedQty,
    min_qty: minQty,
    range_min_qty: rangeMinQty,
    range_max_qty: rangeMaxQty,
    reason,
    message: buildPricingResolutionMessage({
      mode,
      minQty,
      suggestedQty,
      reason,
    }),
    raw,
  };
}

function buildSanitizedUpdateInput(payload: UpdateProductInput): UpdateProductInput {
  const sanitized: UpdateProductInput = {};
  const sanitizedMutable = sanitized as Record<string, unknown>;

  if (payload.name !== undefined) {
    sanitized.name = payload.name.trim();
  }
  if (payload.category !== undefined) {
    sanitized.category = normalizeRequiredText(payload.category, "category");
  }
  if (payload.family !== undefined) {
    sanitized.family = normalizeRequiredText(payload.family, "family");
  }

  const nullableTextFields: Array<keyof Pick<
    UpdateProductInput,
    | "variant_label"
    | "size_label"
    | "material"
    | "base_color"
    | "print_type"
    | "personalization_area"
    | "summary"
    | "details"
    | "notes"
  >> = [
    "variant_label",
    "size_label",
    "material",
    "base_color",
    "print_type",
    "personalization_area",
    "summary",
    "details",
    "notes",
  ];

  for (const field of nullableTextFields) {
    if (field in payload) {
      sanitizedMutable[field] = normalizeNullableText(payload[field]);
    }
  }

  const passthroughFields: Array<keyof UpdateProductInput> = [
    "pricing_mode",
    "price_crc",
    "price_from_crc",
    "min_qty",
    "is_active",
    "is_agent_visible",
    "allows_name",
    "includes_design_adjustment_count",
    "extra_adjustment_has_cost",
    "requires_design_approval",
    "is_full_color",
    "is_premium",
    "is_discountable",
    "discount_visibility",
    "search_boost",
    "sort_order",
  ];

  for (const field of passthroughFields) {
    if (field in payload) {
      sanitizedMutable[field] = payload[field];
    }
  }

  return sanitized;
}

function validateMergedProductForUpdate(input: ProductNovaValidationRow) {
  if (!input.name.trim()) {
    throw badRequest("name cannot be empty.", { field: "name" });
  }
  if (!input.category.trim()) {
    throw badRequest("category cannot be empty.", { field: "category" });
  }
  if (!input.family.trim()) {
    throw badRequest("family cannot be empty.", { field: "family" });
  }

  if (input.price_crc != null && input.price_crc < 0) {
    throw badRequest("price_crc must be greater than or equal to 0.", { field: "price_crc" });
  }

  if (input.price_from_crc != null && input.price_from_crc < 0) {
    throw badRequest("price_from_crc must be greater than or equal to 0.", {
      field: "price_from_crc",
    });
  }

  if (input.min_qty != null && input.min_qty < 1) {
    throw badRequest("min_qty must be greater than or equal to 1.", { field: "min_qty" });
  }

  if (input.pricing_mode === "fixed" && input.price_crc == null) {
    throw badRequest("pricing_mode=fixed requires price_crc.", {
      field: "pricing_mode",
      pricing_mode: input.pricing_mode,
      requiredField: "price_crc",
    });
  }
  if (input.pricing_mode === "fixed" && input.price_from_crc != null) {
    throw badRequest("pricing_mode=fixed does not allow price_from_crc.", {
      field: "pricing_mode",
      pricing_mode: input.pricing_mode,
      forbiddenField: "price_from_crc",
    });
  }

  if (input.pricing_mode === "range" && input.price_from_crc == null) {
    throw badRequest("pricing_mode=range requires price_from_crc.", {
      field: "pricing_mode",
      pricing_mode: input.pricing_mode,
      requiredField: "price_from_crc",
    });
  }
  if (input.pricing_mode === "range" && input.price_crc != null) {
    throw badRequest("pricing_mode=range does not allow price_crc.", {
      field: "pricing_mode",
      pricing_mode: input.pricing_mode,
      forbiddenField: "price_crc",
    });
  }

  if (input.pricing_mode === "variable" && input.price_crc == null) {
    throw badRequest("pricing_mode=variable requires price_crc as base price.", {
      field: "pricing_mode",
      pricing_mode: input.pricing_mode,
      requiredField: "price_crc",
    });
  }
  if (input.pricing_mode === "variable" && input.price_from_crc != null) {
    throw badRequest("pricing_mode=variable does not allow price_from_crc.", {
      field: "pricing_mode",
      pricing_mode: input.pricing_mode,
      forbiddenField: "price_from_crc",
    });
  }

  if (!input.is_discountable && input.discount_visibility !== "never") {
    throw badRequest("Non-discountable products must use discount_visibility=never.", {
      field: "discount_visibility",
      is_discountable: input.is_discountable,
      discount_visibility: input.discount_visibility,
    });
  }
}

async function listNovaDiscoveryTerms(
  db: Prisma.TransactionClient | PrismaClient,
  input: { productId: string; family: string; category: string },
): Promise<string[]> {
  const rows = await db.$queryRaw<Array<{ term: string }>>(Prisma.sql`
    SELECT DISTINCT BTRIM(term) AS term
    FROM public.mwl_product_search_terms
    WHERE is_active = TRUE
      AND COALESCE(BTRIM(term), '') <> ''
      AND (
        product_id = ${input.productId}
        OR (product_id IS NULL AND family = ${input.family})
        OR (product_id IS NULL AND family IS NULL AND category = ${input.category})
      )
    ORDER BY BTRIM(term) ASC
  `);

  return rows
    .map((row) => row.term.trim())
    .filter((term, index, allTerms) => term.length > 0 && allTerms.indexOf(term) === index)
    .filter(isSearchTermUsefulForNova);
}

export function validateProductForNovaPublication(input: {
  product: ProductNovaValidationRow;
  discoveryTerms: string[];
}): NovaPublicationValidationResult {
  const blockingIssues: string[] = [];
  const warnings: string[] = [];
  const product = input.product;
  const normalizedName = product.name.trim();
  const normalizedCategory = product.category.trim();
  const normalizedFamily = product.family.trim();
  const normalizedVariant = product.variant_label?.trim() ?? "";
  const normalizedSummary = product.summary?.trim() ?? "";

  if (normalizedName.length < 3 || !/[a-z0-9]/i.test(normalizedName)) {
    blockingIssues.push("name must be descriptive and contain at least 3 alphanumeric characters.");
  }

  if (normalizedCategory.length === 0) {
    blockingIssues.push("category is required.");
  }

  if (normalizedFamily.length === 0) {
    blockingIssues.push("family is required.");
  }

  if (!PRODUCT_PRICING_MODES.includes(product.pricing_mode)) {
    blockingIssues.push("pricing_mode is invalid.");
  } else if (product.pricing_mode === "fixed") {
    if (product.price_crc == null) {
      blockingIssues.push("pricing_mode=fixed requires price_crc.");
    }
    if (product.price_from_crc != null) {
      blockingIssues.push("pricing_mode=fixed must not include price_from_crc.");
    }
  } else if (product.pricing_mode === "range") {
    if (product.price_from_crc == null) {
      blockingIssues.push("pricing_mode=range requires price_from_crc.");
    }
    if (product.price_crc != null) {
      blockingIssues.push("pricing_mode=range must not include price_crc.");
    }
  } else if (product.pricing_mode === "variable") {
    if (product.price_crc == null) {
      blockingIssues.push("pricing_mode=variable requires price_crc as base price.");
    }
    if (product.price_from_crc != null) {
      blockingIssues.push("pricing_mode=variable must not include price_from_crc.");
    }
  }

  if ((product.price_crc ?? 0) < 0) {
    blockingIssues.push("price_crc must be greater than or equal to 0.");
  }
  if ((product.price_from_crc ?? 0) < 0) {
    blockingIssues.push("price_from_crc must be greater than or equal to 0.");
  }

  if (product.min_qty == null || product.min_qty < 1) {
    blockingIssues.push("min_qty must be greater than or equal to 1.");
  }

  if (!product.is_active) {
    blockingIssues.push("is_active must be true for NOVA publication.");
  }

  if (!product.is_agent_visible) {
    blockingIssues.push("is_agent_visible must be true for NOVA publication.");
  }

  if (normalizedSummary.length === 0) {
    blockingIssues.push("summary is required.");
  } else if (normalizedSummary.length < 20) {
    warnings.push("summary is very short; discovery quality may degrade.");
  }

  if (input.discoveryTerms.length === 0) {
    blockingIssues.push(`at least one active search term is required. ${NOVA_SEARCH_TERM_QUALITY_RULE_EN}`);
  } else if (input.discoveryTerms.length < 2) {
    warnings.push("only one discovery term is configured; consider adding more aliases.");
  }

  if (normalizedVariant.length > 0) {
    const loweredVariant = normalizedVariant.toLowerCase();
    if (loweredVariant === normalizedName.toLowerCase()) {
      blockingIssues.push("variant_label must not be identical to name.");
    }
    if (loweredVariant === normalizedFamily.toLowerCase()) {
      blockingIssues.push("variant_label must add detail beyond family.");
    }
    if (loweredVariant === normalizedCategory.toLowerCase()) {
      blockingIssues.push("variant_label must add detail beyond category.");
    }
    if (normalizedVariant.length < 3) {
      warnings.push("variant_label is very short; verify naming coherence.");
    }
  }

  return {
    isNovaReady: blockingIssues.length === 0,
    blockingIssues,
    warnings,
  };
}

function assertNovaPublicationIfAgentVisible(input: {
  product: ProductNovaValidationRow;
  discoveryTerms: string[];
  operation: string;
}) {
  const validation = validateProductForNovaPublication({
    product: input.product,
    discoveryTerms: input.discoveryTerms,
  });

  if (input.product.is_agent_visible && !validation.isNovaReady) {
    throw badRequest(
      "Product cannot remain agent-visible because it does not satisfy NOVA publication requirements.",
      {
        operation: input.operation,
        field: "is_agent_visible",
        novaValidation: validation,
      },
    );
  }
}

function normalizeCreatePayload(payload: CreateProductInput): CreateProductInput {
  return {
    ...payload,
    name: normalizeRequiredText(payload.name, "name"),
    category: normalizeRequiredText(payload.category, "category"),
    family: normalizeRequiredText(payload.family, "family"),
    variant_label: normalizeNullableText(payload.variant_label),
    size_label: normalizeNullableText(payload.size_label),
    material: normalizeNullableText(payload.material),
    base_color: normalizeNullableText(payload.base_color),
    print_type: normalizeNullableText(payload.print_type),
    personalization_area: normalizeNullableText(payload.personalization_area),
    summary: normalizeNullableText(payload.summary),
    details: normalizeNullableText(payload.details),
    notes: normalizeNullableText(payload.notes),
  };
}

function buildCreateDefaults(input: CreateProductInput): CreateProductInput {
  const isDiscountable = input.is_discountable ?? false;
  const discountVisibility =
    input.discount_visibility ??
    (isDiscountable ? PRODUCT_DEFAULTS.discount_visibility : "never");

  return {
    ...input,
    is_active: input.is_active ?? true,
    is_agent_visible: input.is_agent_visible ?? true,
    allows_name: input.allows_name ?? false,
    includes_design_adjustment_count: input.includes_design_adjustment_count ?? 0,
    extra_adjustment_has_cost: input.extra_adjustment_has_cost ?? false,
    requires_design_approval:
      input.requires_design_approval ?? PRODUCT_DEFAULTS.requires_design_approval,
    is_full_color: input.is_full_color ?? false,
    is_premium: input.is_premium ?? false,
    is_discountable: isDiscountable,
    discount_visibility: discountVisibility,
    search_boost: input.search_boost ?? 0,
    sort_order: input.sort_order ?? 0,
  };
}

async function validateCategoryAndFamilyAgainstCatalog(
  db: Prisma.TransactionClient | PrismaClient,
  input: { category: string; family: string },
) {
  const [row] = await db.$queryRaw<Array<{ category_exists: boolean; family_exists: boolean }>>(Prisma.sql`
    SELECT
      (
        EXISTS(
          SELECT 1
          FROM public.mwl_products
          WHERE LOWER(category) = LOWER(${input.category})
        )
        OR EXISTS(
          SELECT 1
          FROM public.catalog_sku_code_dictionary d
          WHERE d.scope_type = 'business'
            AND d.scope_key_normalized = 'mwl'
            AND d.dictionary_type = 'category'
            AND d.is_active = TRUE
            AND d.source_key_normalized = LOWER(REGEXP_REPLACE(BTRIM(${input.category}), '\\s+', '_', 'g'))
        )
      ) AS category_exists,
      (
        EXISTS(
          SELECT 1
          FROM public.mwl_products
          WHERE LOWER(family) = LOWER(${input.family})
        )
        OR EXISTS(
          SELECT 1
          FROM public.catalog_sku_code_dictionary d
          WHERE d.scope_type = 'business'
            AND d.scope_key_normalized = 'mwl'
            AND d.dictionary_type = 'family'
            AND d.is_active = TRUE
            AND d.source_key_normalized = LOWER(REGEXP_REPLACE(BTRIM(${input.family}), '\\s+', '_', 'g'))
        )
      ) AS family_exists
  `);

  if (!row) {
    return;
  }

  if (!row.category_exists) {
    throw badRequest("category must match catalog taxonomy (mwl products or sku dictionary).", {
      field: "category",
      category: input.category,
    });
  }

  if (!row.family_exists) {
    throw badRequest("family must match catalog taxonomy (mwl products or sku dictionary).", {
      field: "family",
      family: input.family,
    });
  }
}

type SkuDictionaryType = "category" | "family" | "variant" | "material";

function normalizeDictionarySourceKey(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase();
}

function normalizeSkuToken(value: string | null | undefined): string {
  const cleaned = (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned;
}

function normalizeSkuSizeToken(value: string | null | undefined): string {
  const normalized = (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/cm$/g, "")
    .trim();

  const upper = normalized.toUpperCase();
  const protectedOz = upper.replace(/OZ/g, "§");
  const whitelisted = protectedOz.replace(/[^0-9X.§]+/g, "");

  const dimensionMatch = whitelisted.match(/^\d+(?:\.\d+)?(?:X\d+(?:\.\d+)?)+/);
  if (dimensionMatch) {
    return dimensionMatch[0].replace(/X+/g, "X");
  }

  const ozMatch = whitelisted.match(/^\d+(?:\.\d+)?§$/);
  if (ozMatch) {
    return ozMatch[0].replace("§", "OZ");
  }

  return whitelisted.replace(/§/g, "");
}

function normalizeProductIdToken(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function resolveSkuDictionaryCodes(
  db: Prisma.TransactionClient | PrismaClient,
  input: {
    category: string;
    family: string;
    variant_label?: string | null;
    material?: string | null;
  },
): Promise<{
  categoryCode: string | null;
  familyCode: string | null;
  variantCode: string | null;
  materialCode: string | null;
}> {
  const lookups: Array<{
    type: SkuDictionaryType;
    rawValue: string | null | undefined;
    normalizedValue: string;
  }> = [
    {
      type: "category" as SkuDictionaryType,
      rawValue: input.category,
      normalizedValue: normalizeDictionarySourceKey(input.category),
    },
    {
      type: "family" as SkuDictionaryType,
      rawValue: input.family,
      normalizedValue: normalizeDictionarySourceKey(input.family),
    },
    {
      type: "variant" as SkuDictionaryType,
      rawValue: input.variant_label,
      normalizedValue: normalizeDictionarySourceKey(input.variant_label),
    },
    {
      type: "material" as SkuDictionaryType,
      rawValue: input.material,
      normalizedValue: normalizeDictionarySourceKey(input.material),
    },
  ].filter((entry) => entry.normalizedValue.length > 0);

  if (lookups.length === 0) {
    return {
      categoryCode: null,
      familyCode: null,
      variantCode: null,
      materialCode: null,
    };
  }

  const dictionaryTypes = Array.from(
    new Set(lookups.map((entry) => entry.type)),
  ) as SkuDictionaryType[];
  const sourceKeys = Array.from(
    new Set(lookups.map((entry) => entry.normalizedValue)),
  );

  const rows = await db.$queryRaw<
    Array<{
      dictionary_type: SkuDictionaryType;
      source_key_normalized: string;
      code: string;
    }>
  >(Prisma.sql`
    SELECT
      d.dictionary_type::text AS dictionary_type,
      d.source_key_normalized,
      d.code
    FROM public.catalog_sku_code_dictionary d
    WHERE d.scope_type = 'business'
      AND d.scope_key_normalized = 'mwl'
      AND d.is_active = TRUE
      AND d.dictionary_type = ANY(${dictionaryTypes}::text[])
      AND d.source_key_normalized = ANY(${sourceKeys}::text[])
  `);

  const codesByKey = new Map<string, string>();
  for (const row of rows) {
    const code = normalizeSkuToken(row.code);
    if (!code) {
      continue;
    }
    codesByKey.set(`${row.dictionary_type}:${row.source_key_normalized}`, code);
  }

  const resolve = (type: SkuDictionaryType, rawValue: string | null | undefined): string | null => {
    const normalizedValue = normalizeDictionarySourceKey(rawValue);
    if (!normalizedValue) {
      return null;
    }
    return codesByKey.get(`${type}:${normalizedValue}`) ?? null;
  };

  return {
    categoryCode: resolve("category", input.category),
    familyCode: resolve("family", input.family),
    variantCode: resolve("variant", input.variant_label),
    materialCode: resolve("material", input.material),
  };
}

async function generateSkuForNewProduct(
  db: Prisma.TransactionClient | PrismaClient,
  input: {
    category: string;
    family: string;
    variant_label?: string | null;
    size_label?: string | null;
    material?: string | null;
  },
): Promise<string> {
  const codes = await resolveSkuDictionaryCodes(db, {
    category: input.category,
    family: input.family,
    variant_label: input.variant_label,
    material: input.material,
  });

  if (!codes.categoryCode) {
    throw badRequest("Unable to generate SKU: category code mapping not found.", {
      field: "category",
      category: input.category,
      dictionary_scope_type: "business",
      dictionary_scope_key: "mwl",
    });
  }

  if (!codes.familyCode) {
    throw badRequest("Unable to generate SKU: family code mapping not found.", {
      field: "family",
      family: input.family,
      dictionary_scope_type: "business",
      dictionary_scope_key: "mwl",
    });
  }

  const sizeToken = normalizeSkuSizeToken(input.size_label);
  const variantToken = codes.variantCode;
  const tokenCandidates = [codes.categoryCode, codes.familyCode, sizeToken, variantToken];
  const tokens = tokenCandidates.filter((value): value is string => Boolean(value));
  const dedupedTokens = tokens.filter((token, index) => index === 0 || token !== tokens[index - 1]);

  const baseSku = `MWL-${dedupedTokens.join("-")}`.slice(0, 120);
  if (baseSku === "MWL-" || baseSku.length <= 4) {
    throw badRequest("Unable to generate SKU: insufficient normalized data.", {
      category: input.category,
      family: input.family,
      size_label: input.size_label ?? null,
      variant_label: input.variant_label ?? null,
    });
  }

  return baseSku;
}

async function generateProductIdBase(
  db: Prisma.TransactionClient | PrismaClient,
  input: {
    category: string;
    family: string;
    variant_label?: string | null;
    size_label?: string | null;
  },
): Promise<string> {
  const codes = await resolveSkuDictionaryCodes(db, {
    category: input.category,
    family: input.family,
    variant_label: input.variant_label,
    material: null,
  });

  const categoryToken =
    normalizeProductIdToken(codes.categoryCode) || normalizeProductIdToken(input.category);
  const familyToken =
    normalizeProductIdToken(codes.familyCode) || normalizeProductIdToken(input.family);
  const variantTokenFromCode = normalizeProductIdToken(codes.variantCode);
  const variantTokenFromLabel = normalizeProductIdToken(input.variant_label);
  const variantToken = variantTokenFromCode || variantTokenFromLabel || "std";
  const sizeToken = normalizeProductIdToken(normalizeSkuSizeToken(input.size_label));

  const rawTokens = [categoryToken, familyToken];
  if (
    variantToken === "std" &&
    sizeToken &&
    sizeToken !== categoryToken &&
    sizeToken !== familyToken
  ) {
    rawTokens.push(sizeToken);
  }
  rawTokens.push(variantToken);

  // Keep semantic stability and avoid duplicated concepts in the id.
  const dedupedTokens = rawTokens.filter(
    (token, index, allTokens) => token && allTokens.indexOf(token) === index,
  );

  const base = dedupedTokens.join("_").slice(0, 64).replace(/^_+|_+$/g, "");
  return base || "product_std";
}

export async function previewProductSku(
  payload: ProductSkuPreviewInput,
  options?: ServiceOptions,
): Promise<ProductSkuPreviewResult> {
  const db = resolveDb(options);
  const category = normalizeRequiredText(payload.category, "category");
  const family = normalizeRequiredText(payload.family, "family");
  const variantLabel = normalizeNullableText(payload.variant_label);
  const sizeLabel = normalizeNullableText(payload.size_label);
  const material = normalizeNullableText(payload.material);

  await validateCategoryAndFamilyAgainstCatalog(db, {
    category,
    family,
  });

  const baseSku = await generateSkuForNewProduct(db, {
    category,
    family,
    variant_label: variantLabel ?? null,
    size_label: sizeLabel ?? null,
    material: material ?? null,
  });
  const uniqueSku = await resolveUniqueProductSku(db, baseSku);
  const baseId = await generateProductIdBase(db, {
    category,
    family,
    variant_label: variantLabel ?? null,
    size_label: sizeLabel ?? null,
  });
  const uniqueId = await resolveUniqueProductId(db, baseId);

  return {
    sku: uniqueSku,
    base_sku: baseSku,
    id_base: baseId,
    id_preview: uniqueId,
    dictionary_scope_type: "business",
    dictionary_scope_key: "mwl",
  };
}

async function resolveUniqueProductId(
  db: Prisma.TransactionClient | PrismaClient,
  baseId: string,
): Promise<string> {
  const rows = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id
    FROM public.mwl_products
    WHERE id = ${baseId}
      OR id LIKE ${`${baseId}_%`}
  `);

  if (!rows.some((row) => row.id === baseId)) {
    return baseId;
  }

  const escapedBaseId = escapeRegexLiteral(baseId);
  const suffixes = rows
    .map((row) => {
      const match = new RegExp(`^${escapedBaseId}_(\\d+)$`).exec(row.id);
      return match ? Number.parseInt(match[1] ?? "", 10) : null;
    })
    .filter((value): value is number => value !== null && Number.isInteger(value) && value >= 2);

  const next = (suffixes.length > 0 ? Math.max(...suffixes) : 1) + 1;
  return `${baseId}_${next}`;
}

async function resolveUniqueProductSku(
  db: Prisma.TransactionClient | PrismaClient,
  baseSku: string,
): Promise<string> {
  const rows = await db.$queryRaw<Array<{ sku: string }>>(Prisma.sql`
    SELECT sku
    FROM public.mwl_products
    WHERE sku = ${baseSku}
      OR sku LIKE ${`${baseSku}-%`}
  `);

  if (!rows.some((row) => row.sku === baseSku)) {
    return baseSku;
  }

  const escapedBaseSku = escapeRegexLiteral(baseSku);
  const suffixes = new Set(
    rows
    .map((row) => {
      const match = new RegExp(`^${escapedBaseSku}-(\\d+)$`).exec(row.sku);
      return match ? Number.parseInt(match[1] ?? "", 10) : null;
    })
      .filter((value): value is number => value !== null && Number.isInteger(value) && value >= 1),
  );

  let next = 1;
  while (suffixes.has(next)) {
    next += 1;
  }

  return `${baseSku}-${String(next).padStart(2, "0")}`;
}

function validateCreatePayload(input: CreateProductInput) {
  if (input.name.trim().length > 180) {
    throw badRequest("name is too long.", { field: "name", maxLength: 180 });
  }

  if (input.price_crc != null && input.price_crc < 0) {
    throw badRequest("price_crc must be greater than or equal to 0.", { field: "price_crc" });
  }

  if (input.price_from_crc != null && input.price_from_crc < 0) {
    throw badRequest("price_from_crc must be greater than or equal to 0.", {
      field: "price_from_crc",
    });
  }

  if (!Number.isInteger(input.min_qty) || input.min_qty < 1) {
    throw badRequest("min_qty must be an integer greater than or equal to 1.", {
      field: "min_qty",
    });
  }

  if (
    !Number.isInteger(input.includes_design_adjustment_count ?? 0) ||
    (input.includes_design_adjustment_count ?? 0) < 0
  ) {
    throw badRequest("includes_design_adjustment_count must be a non-negative integer.", {
      field: "includes_design_adjustment_count",
    });
  }

  if (!Number.isInteger(input.search_boost ?? 0)) {
    throw badRequest("search_boost must be an integer.", { field: "search_boost" });
  }

  if (!Number.isInteger(input.sort_order ?? 0) || (input.sort_order ?? 0) < 0) {
    throw badRequest("sort_order must be an integer greater than or equal to 0.", {
      field: "sort_order",
    });
  }

  validateMergedProductForUpdate({
    id: "new_product",
    name: input.name,
    category: input.category,
    family: input.family,
    variant_label: input.variant_label ?? null,
    summary: input.summary ?? null,
    pricing_mode: input.pricing_mode,
    price_crc: input.price_crc ?? null,
    price_from_crc: input.price_from_crc ?? null,
    min_qty: input.min_qty,
    is_active: input.is_active ?? true,
    is_agent_visible: input.is_agent_visible ?? true,
    is_discountable: input.is_discountable ?? false,
    discount_visibility:
      input.discount_visibility ??
      (input.is_discountable ? PRODUCT_DEFAULTS.discount_visibility : "never"),
  });
}

function shouldRefreshSearchIndex(payload: UpdateProductInput): boolean {
  return (
    payload.name !== undefined ||
    payload.category !== undefined ||
    payload.family !== undefined ||
    payload.summary !== undefined ||
    payload.details !== undefined ||
    payload.search_boost !== undefined
  );
}

export async function updateProduct(
  productId: string,
  payload: UpdateProductInput,
  options?: ServiceOptions,
): Promise<ProductDetail> {
  const db = resolveDb(options);
  const sanitized = buildSanitizedUpdateInput(payload);

  const updateEntries = Object.entries(sanitized).filter(([, value]) => value !== undefined);

  if (updateEntries.length === 0) {
    throw badRequest("No editable fields were provided.");
  }

  const [current] = await db.$queryRaw<ProductNovaValidationRow[]>(Prisma.sql`
    SELECT
      id,
      name,
      category,
      family,
      variant_label,
      summary,
      pricing_mode,
      price_crc,
      price_from_crc,
      min_qty,
      is_active,
      is_agent_visible,
      is_discountable,
      discount_visibility
    FROM public.mwl_products
    WHERE id = ${productId}
    LIMIT 1
  `);

  if (!current) {
    throw notFound("Product not found.", { productId });
  }

  const mergedValidation: ProductNovaValidationRow = {
    id: current.id,
    name: sanitized.name ?? current.name,
    category: sanitized.category ?? current.category,
    family: sanitized.family ?? current.family,
    variant_label:
      sanitized.variant_label !== undefined ? sanitized.variant_label : current.variant_label,
    summary: sanitized.summary !== undefined ? sanitized.summary : current.summary,
    pricing_mode: sanitized.pricing_mode ?? current.pricing_mode,
    price_crc:
      sanitized.price_crc !== undefined ? sanitized.price_crc : current.price_crc,
    price_from_crc:
      sanitized.price_from_crc !== undefined
        ? sanitized.price_from_crc
        : current.price_from_crc,
    min_qty: sanitized.min_qty !== undefined ? sanitized.min_qty : current.min_qty,
    is_active: sanitized.is_active !== undefined ? sanitized.is_active : current.is_active,
    is_agent_visible:
      sanitized.is_agent_visible !== undefined
        ? sanitized.is_agent_visible
        : current.is_agent_visible,
    is_discountable:
      sanitized.is_discountable !== undefined
        ? sanitized.is_discountable
        : current.is_discountable,
    discount_visibility:
      sanitized.discount_visibility !== undefined
        ? sanitized.discount_visibility
        : current.discount_visibility,
  };

  validateMergedProductForUpdate(mergedValidation);
  if (sanitized.category !== undefined || sanitized.family !== undefined) {
    await validateCategoryAndFamilyAgainstCatalog(db, {
      category: mergedValidation.category,
      family: mergedValidation.family,
    });
  }
  const discoveryTerms = await listNovaDiscoveryTerms(db, {
    productId,
    family: mergedValidation.family,
    category: mergedValidation.category,
  });
  assertNovaPublicationIfAgentVisible({
    product: mergedValidation,
    discoveryTerms,
    operation: "update_product",
  });

  const setClauses: Prisma.Sql[] = [];
  for (const [field, value] of updateEntries) {
    setClauses.push(Prisma.sql`${Prisma.raw(field)} = ${value}`);
  }
  setClauses.push(Prisma.sql`updated_at = NOW()`);

  await db.$executeRaw(Prisma.sql`
    UPDATE public.mwl_products
    SET ${Prisma.join(setClauses, ", ")}
    WHERE id = ${productId}
  `);

  if (shouldRefreshSearchIndex(sanitized)) {
    const refreshResult = await refreshSearchIndexSafely(db, {
      productId,
      reason: "product_update",
    });
    if (!refreshResult.success && mergedValidation.is_agent_visible) {
      throwOnFailedNovaIndexRefresh({
        productId,
        reason: "product_update",
        refresh: refreshResult,
      });
    }
  }

  return getProductDetail(productId, options);
}

export async function createProduct(
  payload: CreateProductInput,
  options?: ServiceOptions,
): Promise<ProductDetail> {
  const db = resolveDb(options);
  const normalized = buildCreateDefaults(normalizeCreatePayload(payload));

  validateCreatePayload(normalized);
  await validateCategoryAndFamilyAgainstCatalog(db, {
    category: normalized.category,
    family: normalized.family,
  });

  const baseId = await generateProductIdBase(db, {
    category: normalized.category,
    family: normalized.family,
    variant_label: normalized.variant_label,
    size_label: normalized.size_label,
  });

  const uniqueId = await resolveUniqueProductId(db, baseId);
  const baseSku = await generateSkuForNewProduct(db, {
    category: normalized.category,
    family: normalized.family,
    variant_label: normalized.variant_label,
    size_label: normalized.size_label,
    material: normalized.material,
  });
  const uniqueSku = await resolveUniqueProductSku(db, baseSku);
  const createValidation: ProductNovaValidationRow = {
    id: uniqueId,
    name: normalized.name,
    category: normalized.category,
    family: normalized.family,
    variant_label: normalized.variant_label ?? null,
    summary: normalized.summary ?? null,
    pricing_mode: normalized.pricing_mode,
    price_crc: normalized.price_crc ?? null,
    price_from_crc: normalized.price_from_crc ?? null,
    min_qty: normalized.min_qty,
    is_active: normalized.is_active ?? true,
    is_agent_visible: normalized.is_agent_visible ?? true,
    is_discountable: normalized.is_discountable ?? false,
    discount_visibility:
      normalized.discount_visibility ??
      (normalized.is_discountable ? PRODUCT_DEFAULTS.discount_visibility : "never"),
  };
  const createDiscoveryTerms = await listNovaDiscoveryTerms(db, {
    productId: uniqueId,
    family: normalized.family,
    category: normalized.category,
  });
  assertNovaPublicationIfAgentVisible({
    product: createValidation,
    discoveryTerms: createDiscoveryTerms,
    operation: "create_product",
  });

  await db.$executeRaw(Prisma.sql`
    INSERT INTO public.mwl_products (
      id,
      sku,
      family,
      name,
      category,
      variant_label,
      size_label,
      material,
      base_color,
      print_type,
      personalization_area,
      price_crc,
      price_from_crc,
      min_qty,
      allows_name,
      includes_design_adjustment_count,
      extra_adjustment_has_cost,
      requires_design_approval,
      is_full_color,
      is_premium,
      is_discountable,
      discount_visibility,
      pricing_mode,
      summary,
      details,
      notes,
      source_type,
      source_ref,
      is_active,
      is_agent_visible,
      sort_order,
      search_boost,
      updated_at
    )
    VALUES (
      ${uniqueId},
      ${uniqueSku},
      ${normalized.family},
      ${normalized.name},
      ${normalized.category},
      ${normalized.variant_label ?? null},
      ${normalized.size_label ?? null},
      ${normalized.material ?? null},
      ${normalized.base_color ?? null},
      ${normalized.print_type ?? null},
      ${normalized.personalization_area ?? null},
      ${normalized.price_crc ?? null},
      ${normalized.price_from_crc ?? null},
      ${normalized.min_qty},
      ${normalized.allows_name ?? false},
      ${normalized.includes_design_adjustment_count ?? 0},
      ${normalized.extra_adjustment_has_cost ?? false},
      ${normalized.requires_design_approval ?? PRODUCT_DEFAULTS.requires_design_approval},
      ${normalized.is_full_color ?? false},
      ${normalized.is_premium ?? false},
      ${normalized.is_discountable ?? false},
      ${
        normalized.discount_visibility ??
        (normalized.is_discountable ? PRODUCT_DEFAULTS.discount_visibility : "never")
      },
      ${normalized.pricing_mode},
      ${normalized.summary ?? null},
      ${normalized.details ?? null},
      ${normalized.notes ?? null},
      ${"manual"},
      ${null},
      ${normalized.is_active ?? true},
      ${normalized.is_agent_visible ?? true},
      ${normalized.sort_order ?? 0},
      ${normalized.search_boost ?? 0},
      NOW()
    )
  `);

  const createRefresh = await refreshSearchIndexSafely(db, {
    productId: uniqueId,
    reason: "product_create",
  });
  if (!createRefresh.success && (normalized.is_agent_visible ?? true)) {
    throwOnFailedNovaIndexRefresh({
      productId: uniqueId,
      reason: "product_create",
      refresh: createRefresh,
    });
  }
  return getProductDetail(uniqueId, options);
}

export async function saveProduct(
  payload: SaveProductInput,
  options?: ServiceOptions,
): Promise<SaveProductResult> {
  const db = resolveDb(options);
  const normalizedCore = buildCreateDefaults(normalizeCreatePayload(payload.product));
  const normalizedAliases = normalizeAliasesForSave(payload.aliases);
  const normalizedSearchTerms = normalizeSearchTermsForSave(payload.search_terms);
  const normalizedImages = normalizeImagesForSave(payload.images);
  const normalizedRangePrices = normalizeRangePricesForSave(payload.range_prices);
  const publicationMode = payload.publication_mode;

  if (publicationMode !== "internal" && publicationMode !== "nova") {
    throw badRequest("publication_mode must be either \"internal\" or \"nova\".", {
      field: "publication_mode",
      value: publicationMode,
    });
  }

  validateCreatePayload(normalizedCore);
  if (normalizedCore.pricing_mode === "range" && normalizedRangePrices.length === 0) {
    throw badRequest("pricing_mode=range requires at least one structural range.", {
      field: "range_prices",
      pricing_mode: normalizedCore.pricing_mode,
    });
  }

  if (normalizedCore.pricing_mode !== "range" && normalizedRangePrices.length > 0) {
    throw badRequest("range_prices are only allowed when pricing_mode=range.", {
      field: "range_prices",
      pricing_mode: normalizedCore.pricing_mode,
    });
  }

  const productId = await db.$transaction(
    async (tx) => {
      let resolvedProductId = payload.product_id?.trim() || "";
      const targetAgentVisibility = publicationMode === "nova";

    if (resolvedProductId) {
      const [existing] = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id
        FROM public.mwl_products
        WHERE id = ${resolvedProductId}
        LIMIT 1
      `);

      if (!existing) {
        throw notFound("Product not found.", { productId: resolvedProductId });
      }

      await validateCategoryAndFamilyAgainstCatalog(tx, {
        category: normalizedCore.category,
        family: normalizedCore.family,
      });

      await tx.$executeRaw(Prisma.sql`
        UPDATE public.mwl_products
        SET
          family = ${normalizedCore.family},
          name = ${normalizedCore.name},
          category = ${normalizedCore.category},
          variant_label = ${normalizedCore.variant_label ?? null},
          size_label = ${normalizedCore.size_label ?? null},
          material = ${normalizedCore.material ?? null},
          base_color = ${normalizedCore.base_color ?? null},
          print_type = ${normalizedCore.print_type ?? null},
          personalization_area = ${normalizedCore.personalization_area ?? null},
          price_crc = ${normalizedCore.price_crc ?? null},
          price_from_crc = ${normalizedCore.price_from_crc ?? null},
          min_qty = ${normalizedCore.min_qty},
          allows_name = ${normalizedCore.allows_name ?? false},
          includes_design_adjustment_count = ${normalizedCore.includes_design_adjustment_count ?? 0},
          extra_adjustment_has_cost = ${normalizedCore.extra_adjustment_has_cost ?? false},
          requires_design_approval = ${normalizedCore.requires_design_approval ?? PRODUCT_DEFAULTS.requires_design_approval},
          is_full_color = ${normalizedCore.is_full_color ?? false},
          is_premium = ${normalizedCore.is_premium ?? false},
          is_discountable = ${normalizedCore.is_discountable ?? false},
          discount_visibility = ${
            normalizedCore.discount_visibility ??
            (normalizedCore.is_discountable ? PRODUCT_DEFAULTS.discount_visibility : "never")
          },
          pricing_mode = ${normalizedCore.pricing_mode},
          summary = ${normalizedCore.summary ?? null},
          details = ${normalizedCore.details ?? null},
          notes = ${normalizedCore.notes ?? null},
          is_active = ${normalizedCore.is_active ?? true},
          is_agent_visible = ${targetAgentVisibility},
          sort_order = ${normalizedCore.sort_order ?? 0},
          search_boost = ${normalizedCore.search_boost ?? 0},
          updated_at = NOW()
        WHERE id = ${resolvedProductId}
      `);
    } else {
      await validateCategoryAndFamilyAgainstCatalog(tx, {
        category: normalizedCore.category,
        family: normalizedCore.family,
      });

      const baseId = await generateProductIdBase(tx, {
        category: normalizedCore.category,
        family: normalizedCore.family,
        variant_label: normalizedCore.variant_label,
        size_label: normalizedCore.size_label,
      });
      const uniqueId = await resolveUniqueProductId(tx, baseId);
      const baseSku = await generateSkuForNewProduct(tx, {
        category: normalizedCore.category,
        family: normalizedCore.family,
        variant_label: normalizedCore.variant_label,
        size_label: normalizedCore.size_label,
        material: normalizedCore.material,
      });
      const uniqueSku = await resolveUniqueProductSku(tx, baseSku);

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO public.mwl_products (
          id,
          sku,
          family,
          name,
          category,
          variant_label,
          size_label,
          material,
          base_color,
          print_type,
          personalization_area,
          price_crc,
          price_from_crc,
          min_qty,
          allows_name,
          includes_design_adjustment_count,
          extra_adjustment_has_cost,
          requires_design_approval,
          is_full_color,
          is_premium,
          is_discountable,
          discount_visibility,
          pricing_mode,
          summary,
          details,
          notes,
          source_type,
          source_ref,
          is_active,
          is_agent_visible,
          sort_order,
          search_boost,
          updated_at
        )
        VALUES (
          ${uniqueId},
          ${uniqueSku},
          ${normalizedCore.family},
          ${normalizedCore.name},
          ${normalizedCore.category},
          ${normalizedCore.variant_label ?? null},
          ${normalizedCore.size_label ?? null},
          ${normalizedCore.material ?? null},
          ${normalizedCore.base_color ?? null},
          ${normalizedCore.print_type ?? null},
          ${normalizedCore.personalization_area ?? null},
          ${normalizedCore.price_crc ?? null},
          ${normalizedCore.price_from_crc ?? null},
          ${normalizedCore.min_qty},
          ${normalizedCore.allows_name ?? false},
          ${normalizedCore.includes_design_adjustment_count ?? 0},
          ${normalizedCore.extra_adjustment_has_cost ?? false},
          ${normalizedCore.requires_design_approval ?? PRODUCT_DEFAULTS.requires_design_approval},
          ${normalizedCore.is_full_color ?? false},
          ${normalizedCore.is_premium ?? false},
          ${normalizedCore.is_discountable ?? false},
          ${
            normalizedCore.discount_visibility ??
            (normalizedCore.is_discountable ? PRODUCT_DEFAULTS.discount_visibility : "never")
          },
          ${normalizedCore.pricing_mode},
          ${normalizedCore.summary ?? null},
          ${normalizedCore.details ?? null},
          ${normalizedCore.notes ?? null},
          ${"manual"},
          ${null},
          ${normalizedCore.is_active ?? true},
          ${targetAgentVisibility},
          ${normalizedCore.sort_order ?? 0},
          ${normalizedCore.search_boost ?? 0},
          NOW()
        )
      `);

      resolvedProductId = uniqueId;
    }

    const productValidationBeforeAliases = await getProductNovaValidationRow(tx, resolvedProductId);

    await syncAliasesInTransaction(tx, {
      productId: resolvedProductId,
      aliases: normalizedAliases,
      productName: productValidationBeforeAliases.name,
    });
    await syncSearchTermsInTransaction(tx, {
      productId: resolvedProductId,
      terms: normalizedSearchTerms,
    });
    await syncImagesInTransaction(tx, {
      productId: resolvedProductId,
      images: normalizedImages,
    });
    await syncRangePricesInTransaction(tx, {
      productId: resolvedProductId,
      pricingMode: normalizedCore.pricing_mode,
      rangePrices: normalizedRangePrices,
    });

    const productValidation = await getProductNovaValidationRow(tx, resolvedProductId);
    const discoveryTerms = await listNovaDiscoveryTerms(tx, {
      productId: resolvedProductId,
      family: productValidation.family,
      category: productValidation.category,
    });
    assertNovaPublicationIfAgentVisible({
      product: productValidation,
      discoveryTerms,
      operation: "save_product",
    });

      return resolvedProductId;
    },
    {
      // Save flow can perform many coordinated writes; allow more time to acquire a transaction
      // connection under concurrent API traffic and avoid transient P2028 start-time failures.
      maxWait: 15_000,
      timeout: 60_000,
    },
  );

  const saveRefresh = await refreshSearchIndexSafely(db, {
    productId,
    reason: "product_save_unified",
  });
  const product = await getProductDetail(productId, options);
  const isReadyForNova = product.is_agent_visible;

  if (!saveRefresh.success && isReadyForNova) {
    throwOnFailedNovaIndexRefresh({
      productId,
      reason: "product_save_unified",
      refresh: saveRefresh,
    });
  }

  return {
    product,
    save_state:
      saveRefresh.success && isReadyForNova
        ? "saved_and_published_to_nova"
        : saveRefresh.success
          ? "saved_internal_not_published"
          : "save_failed_index_refresh",
    publication_mode: isReadyForNova ? "nova" : "internal",
    index_refresh: {
      attempted: true,
      status: saveRefresh.success ? "succeeded" : "failed",
      reason: "product_save_unified",
    },
  };
}

export async function addProductImage(
  productId: string,
  payload: AddProductImageInput,
  options?: ServiceOptions,
): Promise<ProductDetail> {
  const db = resolveDb(options);
  await ensureProductExists(db, productId);

  const storageBucket = normalizeRequiredText(
    payload.storage_bucket?.trim() || "mwl-products",
    "storage_bucket",
  );
  const storagePath = normalizeRequiredText(payload.storage_path, "storage_path");
  const altText = normalizeAltText(payload.alt_text);
  const isPrimary = payload.is_primary ?? false;

  if (payload.sort_order != null && payload.sort_order < 0) {
    throw badRequest("sort_order must be greater than or equal to 0.", { field: "sort_order" });
  }

  await db.$transaction(async (tx) => {
    let sortOrder = payload.sort_order;

    if (sortOrder == null) {
      const [maxSort] = await tx.$queryRaw<Array<{ max_sort_order: number | null }>>(Prisma.sql`
        SELECT MAX(sort_order) AS max_sort_order
        FROM public.mwl_product_images
        WHERE product_id = ${productId}
      `);
      sortOrder = (maxSort?.max_sort_order ?? -1) + 1;
    } else {
      await tx.$executeRaw(Prisma.sql`
        UPDATE public.mwl_product_images
        SET sort_order = sort_order + 1
        WHERE product_id = ${productId}
          AND sort_order >= ${sortOrder}
      `);
    }

    if (isPrimary) {
      await tx.$executeRaw(Prisma.sql`
        UPDATE public.mwl_product_images
        SET is_primary = FALSE
        WHERE product_id = ${productId}
      `);
    }

    await tx.$executeRaw(Prisma.sql`
      INSERT INTO public.mwl_product_images (
        product_id,
        storage_bucket,
        storage_path,
        alt_text,
        is_primary,
        sort_order
      )
      VALUES (
        ${productId},
        ${storageBucket},
        ${storagePath},
        ${altText},
        ${isPrimary},
        ${sortOrder}
      )
    `);

    await reindexProductImageSortOrder(tx, productId);
  });

  return getProductDetail(productId, options);
}

export async function updateProductImage(
  productId: string,
  imageId: number,
  payload: UpdateProductImageInput,
  options?: ServiceOptions,
): Promise<ProductDetail> {
  const db = resolveDb(options);

  const [image] = await db.$queryRaw<Array<{
    id: number;
    product_id: string;
    sort_order: number;
  }>>(Prisma.sql`
    SELECT id::integer AS id, product_id, sort_order
    FROM public.mwl_product_images
    WHERE id = ${imageId}
    LIMIT 1
  `);

  if (!image || image.product_id !== productId) {
    throw notFound("Product image not found for this product.", { productId, imageId });
  }

  const normalizedAlt = normalizeAltText(payload.alt_text);

  await db.$transaction(async (tx) => {
    if (payload.sort_order !== undefined) {
      if (payload.sort_order < 0) {
        throw badRequest("sort_order must be greater than or equal to 0.", {
          field: "sort_order",
        });
      }

      const currentOrder = image.sort_order;
      const nextOrder = payload.sort_order;

      if (nextOrder > currentOrder) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE public.mwl_product_images
          SET sort_order = sort_order - 1
          WHERE product_id = ${productId}
            AND id <> ${imageId}
            AND sort_order > ${currentOrder}
            AND sort_order <= ${nextOrder}
        `);
      } else if (nextOrder < currentOrder) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE public.mwl_product_images
          SET sort_order = sort_order + 1
          WHERE product_id = ${productId}
            AND id <> ${imageId}
            AND sort_order >= ${nextOrder}
            AND sort_order < ${currentOrder}
        `);
      }
    }

    if (payload.is_primary === true) {
      await tx.$executeRaw(Prisma.sql`
        UPDATE public.mwl_product_images
        SET is_primary = FALSE
        WHERE product_id = ${productId}
      `);
    }

    const updates: Prisma.Sql[] = [];
    if (payload.alt_text !== undefined) {
      updates.push(Prisma.sql`alt_text = ${normalizedAlt}`);
    }
    if (payload.sort_order !== undefined) {
      updates.push(Prisma.sql`sort_order = ${payload.sort_order}`);
    }
    if (payload.is_primary !== undefined) {
      updates.push(Prisma.sql`is_primary = ${payload.is_primary}`);
    }

    if (updates.length > 0) {
      await tx.$executeRaw(Prisma.sql`
        UPDATE public.mwl_product_images
        SET ${Prisma.join(updates, ", ")}
        WHERE id = ${imageId} AND product_id = ${productId}
      `);
    }

    await reindexProductImageSortOrder(tx, productId);
  });

  return getProductDetail(productId, options);
}

export async function deleteProductImage(
  productId: string,
  imageId: number,
  options?: ServiceOptions,
): Promise<ProductDetail> {
  const db = resolveDb(options);

  await db.$transaction(async (tx) => {
    const [target] = await tx.$queryRaw<Array<{ id: number; is_primary: boolean }>>(Prisma.sql`
      SELECT id::integer AS id, is_primary
      FROM public.mwl_product_images
      WHERE id = ${imageId} AND product_id = ${productId}
      LIMIT 1
    `);

    if (!target) {
      throw notFound("Product image not found for this product.", { productId, imageId });
    }

    await tx.$executeRaw(Prisma.sql`
      DELETE FROM public.mwl_product_images
      WHERE id = ${imageId} AND product_id = ${productId}
    `);

    if (target.is_primary) {
      const [candidate] = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
        SELECT id::integer AS id
        FROM public.mwl_product_images
        WHERE product_id = ${productId}
        ORDER BY sort_order ASC, id ASC
        LIMIT 1
      `);

      if (candidate) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE public.mwl_product_images
          SET is_primary = TRUE
          WHERE id = ${candidate.id}
        `);
      }
    }

    await reindexProductImageSortOrder(tx, productId);
  });

  return getProductDetail(productId, options);
}

export async function addProductAlias(
  productId: string,
  payload: AddProductAliasInput,
  options?: ServiceOptions,
): Promise<ProductDetail> {
  const db = resolveDb(options);
  await ensureProductExists(db, productId);

  const alias = normalizeRequiredText(payload.alias, "alias");
  if (alias.length > 120) {
    throw badRequest("alias is too long.", { field: "alias", maxLength: 120 });
  }

  const [productName] = await db.$queryRaw<Array<{ name: string }>>(Prisma.sql`
    SELECT name
    FROM public.mwl_products
    WHERE id = ${productId}
    LIMIT 1
  `);

  if (productName && productName.name.trim().toLowerCase() === alias.toLowerCase()) {
    throw badRequest("alias should not be identical to product name.", { field: "alias" });
  }

  const [duplicate] = await db.$queryRaw<Array<{ id: number }>>(Prisma.sql`
    SELECT id::integer AS id
    FROM public.mwl_product_aliases
    WHERE product_id = ${productId}
      AND LOWER(alias) = LOWER(${alias})
    LIMIT 1
  `);

  if (duplicate) {
    throw badRequest("alias already exists for this product.", { field: "alias" });
  }

  await db.$executeRaw(Prisma.sql`
    INSERT INTO public.mwl_product_aliases (product_id, alias)
    VALUES (${productId}, ${alias})
  `);

  await refreshSearchIndexSafely(db, { productId, reason: "product_alias_add" });
  return getProductDetail(productId, options);
}

export async function deleteProductAlias(
  productId: string,
  aliasId: number,
  options?: ServiceOptions,
): Promise<ProductDetail> {
  const db = resolveDb(options);

  const [found] = await db.$queryRaw<Array<{ id: number }>>(Prisma.sql`
    SELECT id::integer AS id
    FROM public.mwl_product_aliases
    WHERE id = ${aliasId} AND product_id = ${productId}
    LIMIT 1
  `);

  if (!found) {
    throw notFound("Product alias not found for this product.", { productId, aliasId });
  }

  await db.$executeRaw(Prisma.sql`
    DELETE FROM public.mwl_product_aliases
    WHERE id = ${aliasId} AND product_id = ${productId}
  `);

  await refreshSearchIndexSafely(db, { productId, reason: "product_alias_delete" });
  return getProductDetail(productId, options);
}

function normalizeSearchTermInput(input: {
  term: string;
  term_type: "alias";
  priority?: number;
  notes?: string | null;
  is_active?: boolean;
}) {
  // NOTE(Fase3): keep term_type constrained to "alias" until DB contracts and
  // search engine semantics support additional real values.
  const term = normalizeRequiredText(input.term, "term");
  if (term.length > 120) {
    throw badRequest("term is too long.", { field: "term", maxLength: 120 });
  }
  if ((input.is_active ?? true) && !isSearchTermUsefulForNova(term)) {
    throw badRequest(NOVA_SEARCH_TERM_QUALITY_RULE_EN, { field: "term" });
  }

  const priority = input.priority ?? 100;
  if (priority < 1 || priority > 1000) {
    throw badRequest("priority must be between 1 and 1000.", {
      field: "priority",
      min: 1,
      max: 1000,
    });
  }

  const notes = normalizeNullableText(input.notes);
  if (notes && notes.length > 500) {
    throw badRequest("notes is too long.", { field: "notes", maxLength: 500 });
  }

  return {
    term,
    term_type: input.term_type,
    priority,
    notes,
    is_active: input.is_active ?? true,
  };
}

function normalizeAliasesForSave(input: SaveProductAliasInput[] | undefined): string[] {
  if (!input) {
    return [];
  }

  const unique = new Map<string, string>();
  for (const entry of input) {
    const alias = normalizeRequiredText(entry.alias, "alias");
    if (alias.length > 120) {
      throw badRequest("alias is too long.", { field: "alias", maxLength: 120 });
    }

    const key = alias.toLowerCase();
    if (unique.has(key)) {
      throw badRequest("aliases must be unique (case-insensitive).", {
        field: "aliases",
        alias,
      });
    }

    unique.set(key, alias);
  }

  return Array.from(unique.values());
}

function normalizeSearchTermsForSave(
  input: SaveProductSearchTermInput[] | undefined,
): Array<ReturnType<typeof normalizeSearchTermInput> & { id: number | null }> {
  if (!input) {
    return [];
  }

  const normalizedTerms: Array<ReturnType<typeof normalizeSearchTermInput> & { id: number | null }> = [];
  const seenTerms = new Set<string>();

  for (const entry of input) {
    const normalized = normalizeSearchTermInput({
      term: entry.term,
      term_type: entry.term_type ?? "alias",
      priority: entry.priority,
      is_active: entry.is_active,
      notes: entry.notes,
    });

    const termKey = normalized.term.toLowerCase();
    if (seenTerms.has(termKey)) {
      throw badRequest("search terms must be unique (case-insensitive).", {
        field: "search_terms",
        term: normalized.term,
      });
    }

    const rawId = entry.id ?? null;
    const normalizedId =
      typeof rawId === "number" && Number.isInteger(rawId) && rawId > 0 ? rawId : null;

    seenTerms.add(termKey);
    normalizedTerms.push({
      ...normalized,
      id: normalizedId,
    });
  }

  return normalizedTerms;
}

function normalizeImagesForSave(
  input: SaveProductImageInput[] | undefined,
): Array<{
  id: number | null;
  storage_bucket: string;
  storage_path: string;
  alt_text: string | null | undefined;
  is_primary: boolean;
  sort_order: number;
}> {
  if (!input) {
    return [];
  }

  const normalizedImages: Array<{
    id: number | null;
    storage_bucket: string;
    storage_path: string;
    alt_text: string | null | undefined;
    is_primary: boolean;
    sort_order: number;
  }> = [];

  let firstPrimaryIndex: number | null = null;

  for (let index = 0; index < input.length; index += 1) {
    const entry = input[index]!;
    const rawId = entry.id ?? null;
    const id = typeof rawId === "number" && Number.isInteger(rawId) && rawId > 0 ? rawId : null;
    const storageBucket = normalizeRequiredText(
      entry.storage_bucket?.trim() || "mwl-products",
      "storage_bucket",
    );
    const storagePath = normalizeRequiredText(entry.storage_path, "storage_path");
    const altText = normalizeAltText(entry.alt_text);

    let sortOrder = entry.sort_order ?? index;
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      throw badRequest("sort_order must be an integer greater than or equal to 0.", {
        field: "images.sort_order",
        value: entry.sort_order,
      });
    }

    const wantsPrimary = entry.is_primary === true;
    if (wantsPrimary && firstPrimaryIndex === null) {
      firstPrimaryIndex = index;
    }

    normalizedImages.push({
      id,
      storage_bucket: storageBucket,
      storage_path: storagePath,
      alt_text: altText,
      is_primary: wantsPrimary,
      sort_order: sortOrder,
    });
  }

  if (firstPrimaryIndex !== null) {
    normalizedImages.forEach((image, index) => {
      image.is_primary = index === firstPrimaryIndex;
    });
  }

  return normalizedImages;
}

function normalizeRangePricesForSave(
  input: SaveProductRangePriceInput[] | undefined,
): Array<{
  id: number | null;
  range_min_qty: number;
  range_max_qty: number | null;
  unit_price_crc: number;
  sort_order: number;
  is_active: boolean;
}> {
  if (!input) {
    return [];
  }

  const normalizedRanges: Array<{
    id: number | null;
    range_min_qty: number;
    range_max_qty: number | null;
    unit_price_crc: number;
    sort_order: number;
    is_active: boolean;
  }> = [];

  let activeOpenEndedCount = 0;

  for (let index = 0; index < input.length; index += 1) {
    const entry = input[index]!;
    const rawId = entry.id ?? null;
    const id = typeof rawId === "number" && Number.isInteger(rawId) && rawId > 0 ? rawId : null;

    if (
      !Number.isInteger(entry.range_min_qty) ||
      entry.range_min_qty < 1 ||
      entry.range_min_qty > POSTGRES_INT4_MAX
    ) {
      throw badRequest("range_min_qty must be an integer greater than or equal to 1.", {
        field: "range_prices.range_min_qty",
        value: entry.range_min_qty,
      });
    }

    const normalizedMax = entry.range_max_qty ?? null;
    if (
      normalizedMax != null &&
      (!Number.isInteger(normalizedMax) ||
        normalizedMax < entry.range_min_qty ||
        normalizedMax > POSTGRES_INT4_MAX)
    ) {
      throw badRequest("range_max_qty must be null or an integer greater than or equal to range_min_qty.", {
        field: "range_prices.range_max_qty",
        value: entry.range_max_qty,
      });
    }

    if (
      !Number.isInteger(entry.unit_price_crc) ||
      entry.unit_price_crc <= 0 ||
      entry.unit_price_crc > POSTGRES_INT4_MAX
    ) {
      throw badRequest("unit_price_crc must be an integer greater than 0.", {
        field: "range_prices.unit_price_crc",
        value: entry.unit_price_crc,
      });
    }

    const sortOrder = entry.sort_order ?? index;
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > POSTGRES_INT4_MAX) {
      throw badRequest("sort_order must be an integer greater than or equal to 0.", {
        field: "range_prices.sort_order",
        value: entry.sort_order,
      });
    }

    const isActive = entry.is_active ?? true;
    if (isActive && normalizedMax == null) {
      activeOpenEndedCount += 1;
    }

    normalizedRanges.push({
      id,
      range_min_qty: entry.range_min_qty,
      range_max_qty: normalizedMax,
      unit_price_crc: entry.unit_price_crc,
      sort_order: sortOrder,
      is_active: isActive,
    });
  }

  if (activeOpenEndedCount > 1) {
    throw badRequest("Only one active open-ended range is allowed per product.", {
      field: "range_prices",
    });
  }

  return normalizedRanges;
}

async function syncAliasesInTransaction(
  tx: Prisma.TransactionClient,
  input: { productId: string; aliases: string[]; productName: string },
) {
  const hasInvalidAlias = input.aliases.some(
    (alias) => alias.trim().toLowerCase() === input.productName.trim().toLowerCase(),
  );
  if (hasInvalidAlias) {
    throw badRequest("alias should not be identical to product name.", { field: "aliases" });
  }

  await tx.$executeRaw(Prisma.sql`
    DELETE FROM public.mwl_product_aliases
    WHERE product_id = ${input.productId}
  `);

  if (input.aliases.length === 0) {
    return;
  }

  await tx.$executeRaw(Prisma.sql`
    INSERT INTO public.mwl_product_aliases (product_id, alias)
    SELECT ${input.productId}, alias_value
    FROM unnest(${input.aliases}::text[]) AS alias_value
  `);
}

async function syncSearchTermsInTransaction(
  tx: Prisma.TransactionClient,
  input: {
    productId: string;
    terms: Array<ReturnType<typeof normalizeSearchTermInput> & { id: number | null }>;
  },
) {
  const existingTerms = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
    SELECT id::integer AS id
    FROM public.mwl_product_search_terms
    WHERE product_id = ${input.productId}
  `);
  const existingIds = new Set(existingTerms.map((row) => row.id));

  for (const term of input.terms) {
    if (term.id != null && !existingIds.has(term.id)) {
      throw badRequest("A provided search term id does not belong to this product.", {
        field: "search_terms.id",
        termId: term.id,
      });
    }
  }

  const keepIds = input.terms.map((term) => term.id).filter((id): id is number => id != null);

  if (keepIds.length > 0) {
    await tx.$executeRaw(Prisma.sql`
      DELETE FROM public.mwl_product_search_terms
      WHERE product_id = ${input.productId}
        AND id <> ALL(${keepIds}::int[])
    `);
  } else {
    await tx.$executeRaw(Prisma.sql`
      DELETE FROM public.mwl_product_search_terms
      WHERE product_id = ${input.productId}
    `);
  }

  for (const term of input.terms) {
    if (term.id != null) {
      await tx.$executeRaw(Prisma.sql`
        UPDATE public.mwl_product_search_terms
        SET
          term = ${term.term},
          term_type = ${term.term_type},
          priority = ${term.priority},
          is_active = ${term.is_active},
          notes = ${term.notes}
        WHERE id = ${term.id} AND product_id = ${input.productId}
      `);
      continue;
    }

    await tx.$executeRaw(Prisma.sql`
      INSERT INTO public.mwl_product_search_terms (
        product_id,
        family,
        category,
        term,
        term_type,
        priority,
        is_active,
        notes
      )
      VALUES (
        ${input.productId},
        NULL,
        NULL,
        ${term.term},
        ${term.term_type},
        ${term.priority},
        ${term.is_active},
        ${term.notes}
      )
    `);
  }
}

async function syncImagesInTransaction(
  tx: Prisma.TransactionClient,
  input: {
    productId: string;
    images: Array<{
      id: number | null;
      storage_bucket: string;
      storage_path: string;
      alt_text: string | null | undefined;
      is_primary: boolean;
      sort_order: number;
    }>;
  },
) {
  const existingImages = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
    SELECT id::integer AS id
    FROM public.mwl_product_images
    WHERE product_id = ${input.productId}
  `);
  const existingIds = new Set(existingImages.map((row) => row.id));

  for (const image of input.images) {
    if (image.id != null && !existingIds.has(image.id)) {
      throw badRequest("A provided image id does not belong to this product.", {
        field: "images.id",
        imageId: image.id,
      });
    }
  }

  const keepIds = input.images.map((image) => image.id).filter((id): id is number => id != null);
  if (keepIds.length > 0) {
    await tx.$executeRaw(Prisma.sql`
      DELETE FROM public.mwl_product_images
      WHERE product_id = ${input.productId}
        AND id <> ALL(${keepIds}::int[])
    `);
  } else {
    await tx.$executeRaw(Prisma.sql`
      DELETE FROM public.mwl_product_images
      WHERE product_id = ${input.productId}
    `);
  }

  for (let index = 0; index < input.images.length; index += 1) {
    const image = input.images[index]!;

    if (image.id != null) {
      await tx.$executeRaw(Prisma.sql`
        UPDATE public.mwl_product_images
        SET
          storage_bucket = ${image.storage_bucket},
          storage_path = ${image.storage_path},
          alt_text = ${image.alt_text ?? null},
          is_primary = ${image.is_primary},
          sort_order = ${image.sort_order}
        WHERE id = ${image.id} AND product_id = ${input.productId}
      `);
      continue;
    }

    await tx.$executeRaw(Prisma.sql`
      INSERT INTO public.mwl_product_images (
        product_id,
        storage_bucket,
        storage_path,
        alt_text,
        is_primary,
        sort_order
      )
      VALUES (
        ${input.productId},
        ${image.storage_bucket},
        ${image.storage_path},
        ${image.alt_text ?? null},
        ${image.is_primary},
        ${image.sort_order}
      )
    `);
  }

  await reindexProductImageSortOrder(tx, input.productId);
}

async function syncRangePricesInTransaction(
  tx: Prisma.TransactionClient,
  input: {
    productId: string;
    pricingMode: "fixed" | "range" | "variable";
    rangePrices: Array<{
      id: number | null;
      range_min_qty: number;
      range_max_qty: number | null;
      unit_price_crc: number;
      sort_order: number;
      is_active: boolean;
    }>;
  },
) {
  if (input.pricingMode !== "range") {
    await tx.$executeRaw(Prisma.sql`
      DELETE FROM public.mwl_product_range_prices
      WHERE product_id = ${input.productId}
    `);
    return;
  }

  if (input.rangePrices.length === 0) {
    throw badRequest("pricing_mode=range requires at least one structural range.", {
      field: "range_prices",
      pricing_mode: input.pricingMode,
    });
  }

  await tx.$executeRaw(Prisma.sql`
    DELETE FROM public.mwl_product_range_prices
    WHERE product_id = ${input.productId}
  `);

  const sortedRanges = [...input.rangePrices].sort((left, right) => {
    if (left.range_min_qty !== right.range_min_qty) {
      return left.range_min_qty - right.range_min_qty;
    }
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }
    return left.unit_price_crc - right.unit_price_crc;
  });

  const values = sortedRanges.map((range, index) => {
    const sortOrder = Number.isInteger(range.sort_order) ? range.sort_order : index;
    return Prisma.sql`(
      ${input.productId},
      ${range.range_min_qty},
      ${range.range_max_qty},
      ${range.unit_price_crc},
      ${sortOrder},
      ${range.is_active}
    )`;
  });

  await tx.$executeRaw(Prisma.sql`
    INSERT INTO public.mwl_product_range_prices (
      product_id,
      range_min_qty,
      range_max_qty,
      unit_price_crc,
      sort_order,
      is_active
    )
    VALUES ${Prisma.join(values, ", ")}
  `);
}

export async function addProductSearchTerm(
  productId: string,
  payload: AddProductSearchTermInput,
  options?: ServiceOptions,
): Promise<ProductDetail> {
  const db = resolveDb(options);
  const normalized = normalizeSearchTermInput(payload);

  await db.$transaction(async (tx) => {
    const product = await getProductNovaValidationRow(tx, productId);

    const [duplicate] = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      SELECT id::integer AS id
      FROM public.mwl_product_search_terms
      WHERE product_id = ${productId}
        AND LOWER(term) = LOWER(${normalized.term})
      LIMIT 1
    `);

    if (duplicate) {
      throw badRequest("search term already exists for this product.", { field: "term" });
    }

    await tx.$executeRaw(Prisma.sql`
      INSERT INTO public.mwl_product_search_terms (
        product_id,
        family,
        category,
        term,
        term_type,
        priority,
        is_active,
        notes
      )
      VALUES (
        ${productId},
        NULL,
        NULL,
        ${normalized.term},
        ${normalized.term_type},
        ${normalized.priority},
        ${normalized.is_active},
        ${normalized.notes}
      )
    `);

    const discoveryTerms = await listNovaDiscoveryTerms(tx, {
      productId,
      family: product.family,
      category: product.category,
    });
    assertNovaPublicationIfAgentVisible({
      product,
      discoveryTerms,
      operation: "search_term_add",
    });
  });

  await refreshSearchIndexSafely(db, { productId, reason: "search_term_add" });
  return getProductDetail(productId, options);
}

export async function updateProductSearchTerm(
  productId: string,
  termId: number,
  payload: UpdateProductSearchTermInput,
  options?: ServiceOptions,
): Promise<ProductDetail> {
  const db = resolveDb(options);

  await db.$transaction(async (tx) => {
    const product = await getProductNovaValidationRow(tx, productId);
    const [existing] = await tx.$queryRaw<Array<{
      id: number;
      product_id: string | null;
      term: string;
      term_type: "alias";
      priority: number;
      is_active: boolean;
      notes: string | null;
    }>>(Prisma.sql`
      SELECT
        id::integer AS id,
        product_id,
        term,
        term_type,
        priority,
        is_active,
        notes
      FROM public.mwl_product_search_terms
      WHERE id = ${termId}
      LIMIT 1
    `);

    if (!existing || existing.product_id !== productId) {
      throw notFound("Product search term not found for this product.", { productId, termId });
    }

    const merged = normalizeSearchTermInput({
      term: payload.term ?? existing.term,
      term_type: payload.term_type ?? existing.term_type,
      priority: payload.priority ?? existing.priority,
      notes: payload.notes !== undefined ? payload.notes : existing.notes,
      is_active: payload.is_active ?? existing.is_active,
    });

    const [duplicate] = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      SELECT id::integer AS id
      FROM public.mwl_product_search_terms
      WHERE product_id = ${productId}
        AND LOWER(term) = LOWER(${merged.term})
        AND id <> ${termId}
      LIMIT 1
    `);

    if (duplicate) {
      throw badRequest("search term already exists for this product.", { field: "term" });
    }

    await tx.$executeRaw(Prisma.sql`
      UPDATE public.mwl_product_search_terms
      SET
        term = ${merged.term},
        term_type = ${merged.term_type},
        priority = ${merged.priority},
        is_active = ${merged.is_active},
        notes = ${merged.notes}
      WHERE id = ${termId} AND product_id = ${productId}
    `);

    const discoveryTerms = await listNovaDiscoveryTerms(tx, {
      productId,
      family: product.family,
      category: product.category,
    });
    assertNovaPublicationIfAgentVisible({
      product,
      discoveryTerms,
      operation: "search_term_update",
    });
  });

  await refreshSearchIndexSafely(db, { productId, reason: "search_term_update" });
  return getProductDetail(productId, options);
}

export async function deleteProductSearchTerm(
  productId: string,
  termId: number,
  options?: ServiceOptions,
): Promise<ProductDetail> {
  const db = resolveDb(options);

  await db.$transaction(async (tx) => {
    const product = await getProductNovaValidationRow(tx, productId);
    const [found] = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      SELECT id::integer AS id
      FROM public.mwl_product_search_terms
      WHERE id = ${termId} AND product_id = ${productId}
      LIMIT 1
    `);

    if (!found) {
      throw notFound("Product search term not found for this product.", { productId, termId });
    }

    await tx.$executeRaw(Prisma.sql`
      DELETE FROM public.mwl_product_search_terms
      WHERE id = ${termId} AND product_id = ${productId}
    `);

    const discoveryTerms = await listNovaDiscoveryTerms(tx, {
      productId,
      family: product.family,
      category: product.category,
    });
    assertNovaPublicationIfAgentVisible({
      product,
      discoveryTerms,
      operation: "search_term_delete",
    });
  });

  await refreshSearchIndexSafely(db, { productId, reason: "search_term_delete" });
  return getProductDetail(productId, options);
}

export async function getProductsPerformance(
  params: GetProductsPerformanceParams,
  options?: ServiceOptions,
): Promise<ProductsPerformanceResponse> {
  const db = resolveDb(options);
  const window = resolvePerformanceRangeWindow(params.range);
  const whereClause = buildBaseWhere({
    search: params.search,
    category: params.category,
    family: params.family,
    isActive: params.isActive,
    isAgentVisible: params.isAgentVisible,
    pricingMode: params.pricingMode,
    maxPriceCrc: params.maxPriceCrc,
    minQty: params.minQty,
    exactProductId: params.exactProductId,
  });

  const alwaysIncludedStatusesSql = Prisma.join(
    PERFORMANCE_ALWAYS_INCLUDED_ORDER_STATUSES.map(
      (status) => Prisma.sql`${status}::public.order_status_enum`,
    ),
    ", ",
  );
  const excludedStatusesSql = Prisma.join(
    PERFORMANCE_EXCLUDED_ORDER_STATUSES.map(
      (status) => Prisma.sql`${status}::public.order_status_enum`,
    ),
    ", ",
  );
  const performanceOrderEligibilitySql = Prisma.sql`
    (
      o.status IN (${alwaysIncludedStatusesSql})
      OR (
        o.status NOT IN (${excludedStatusesSql})
        AND LOWER(COALESCE(o.payment_status, '')) = ${PERFORMANCE_VALID_PAYMENT_STATUS}
      )
    )
  `;

  const currentPeriodFilter = window.start
    ? Prisma.sql`AND o.created_at >= ${window.start} AND o.created_at < ${window.end}`
    : Prisma.empty;
  const previousPeriodFilter =
    window.previousStart && window.previousEnd
      ? Prisma.sql`AND o.created_at >= ${window.previousStart} AND o.created_at < ${window.previousEnd}`
      : Prisma.sql`AND FALSE`;

  const performanceRowsRaw = await db.$queryRaw<PerformanceRowRaw[]>(Prisma.sql`
    WITH filtered_products AS (
      SELECT
        v.id,
        v.sku,
        v.name,
        v.category,
        v.family,
        v.variant_label,
        v.size_label,
        v.updated_at,
        v.is_active,
        v.is_agent_visible
      ${baseFrom}
      ${whereClause}
    ),
    current_metrics AS (
      SELECT
        oi.product_id,
        SUM(oi.quantity)::bigint AS units_sold,
        SUM(COALESCE(oi.total_price_crc, 0))::bigint AS revenue_crc
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      JOIN filtered_products fp ON fp.id = oi.product_id
      WHERE oi.product_id IS NOT NULL
        AND ${performanceOrderEligibilitySql}
        ${currentPeriodFilter}
      GROUP BY oi.product_id
    ),
    previous_metrics AS (
      SELECT
        oi.product_id,
        SUM(oi.quantity)::bigint AS units_sold,
        SUM(COALESCE(oi.total_price_crc, 0))::bigint AS revenue_crc
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      JOIN filtered_products fp ON fp.id = oi.product_id
      WHERE oi.product_id IS NOT NULL
        AND ${performanceOrderEligibilitySql}
        ${previousPeriodFilter}
      GROUP BY oi.product_id
    )
    SELECT
      fp.id,
      fp.sku,
      fp.name,
      fp.category,
      fp.family,
      fp.variant_label,
      fp.size_label,
      fp.updated_at,
      fp.is_active,
      fp.is_agent_visible,
      COALESCE(cm.units_sold, 0) AS units_sold,
      COALESCE(cm.revenue_crc, 0) AS revenue_crc,
      COALESCE(pm.units_sold, 0) AS units_previous_period,
      COALESCE(pm.revenue_crc, 0) AS revenue_previous_period
    FROM filtered_products fp
    LEFT JOIN current_metrics cm ON cm.product_id = fp.id
    LEFT JOIN previous_metrics pm ON pm.product_id = fp.id
    ORDER BY COALESCE(cm.revenue_crc, 0) DESC, COALESCE(cm.units_sold, 0) DESC, fp.name ASC
  `);

  const trendBucketSql =
    window.trendGranularity === "day"
      ? Prisma.sql`DATE_TRUNC('day', o.created_at AT TIME ZONE 'UTC')`
      : Prisma.sql`DATE_TRUNC('week', o.created_at AT TIME ZONE 'UTC')`;

  const trendPeriodFilter = window.start
    ? Prisma.sql`AND o.created_at >= ${window.start} AND o.created_at < ${window.end}`
    : Prisma.empty;

  const trendRaw = await db.$queryRaw<PerformanceTrendRaw[]>(Prisma.sql`
    WITH filtered_products AS (
      SELECT v.id
      ${baseFrom}
      ${whereClause}
    )
    SELECT
      ${trendBucketSql} AS bucket_start,
      SUM(oi.quantity)::bigint AS units_sold,
      SUM(COALESCE(oi.total_price_crc, 0))::bigint AS revenue_crc
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    JOIN filtered_products fp ON fp.id = oi.product_id
    WHERE oi.product_id IS NOT NULL
      AND ${performanceOrderEligibilitySql}
      ${trendPeriodFilter}
    GROUP BY ${trendBucketSql}
    ORDER BY ${trendBucketSql} ASC
  `);

  const rows = performanceRowsRaw.map(mapPerformanceRow);

  const topUnits = [...rows]
    .filter((row) => row.units_sold > 0)
    .sort((left, right) => right.units_sold - left.units_sold)
    .slice(0, 5)
    .map<ProductTopPerformanceEntry>((row) => ({
      product_id: row.id,
      name: row.name,
      units_sold: row.units_sold,
      revenue_crc: row.revenue_crc,
    }));

  const topRevenue = [...rows]
    .filter((row) => row.revenue_crc > 0)
    .sort((left, right) => right.revenue_crc - left.revenue_crc)
    .slice(0, 5)
    .map<ProductTopPerformanceEntry>((row) => ({
      product_id: row.id,
      name: row.name,
      units_sold: row.units_sold,
      revenue_crc: row.revenue_crc,
    }));

  const trendMap = new Map<string, { units_sold: number; revenue_crc: number }>(
    trendRaw.map((point) => {
      const date = new Date(point.bucket_start);
      const key = date.toISOString();
      return [
        key,
        {
          units_sold: toCount(point.units_sold),
          revenue_crc: toCount(point.revenue_crc),
        },
      ];
    }),
  );

  const trend: ProductPerformanceTrendPoint[] = [];
  if (window.trendGranularity === "day" && window.start) {
    const cursor = new Date(window.start);
    const endDay = new Date(window.end);
    endDay.setUTCHours(0, 0, 0, 0);

    while (cursor <= endDay) {
      const key = cursor.toISOString();
      const point = trendMap.get(key) ?? { units_sold: 0, revenue_crc: 0 };
      trend.push({
        bucket_start: key,
        label: formatTrendLabel({
          bucketStart: new Date(cursor),
          granularity: "day",
        }),
        units_sold: point.units_sold,
        revenue_crc: point.revenue_crc,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  } else {
    for (const point of trendRaw) {
      const bucketStart = new Date(point.bucket_start);
      trend.push({
        bucket_start: bucketStart.toISOString(),
        label: formatTrendLabel({
          bucketStart,
          granularity: window.trendGranularity,
        }),
        units_sold: toCount(point.units_sold),
        revenue_crc: toCount(point.revenue_crc),
      });
    }
  }

  const rowsByGrowth = rows
    .filter((row) => row.growth_percent != null)
    .sort((left, right) => (right.growth_percent ?? 0) - (left.growth_percent ?? 0));
  const rowsWithDrop = rowsByGrowth.filter((row) => (row.growth_percent ?? 0) < 0);
  const rowsWithNoSales = rows
    .filter((row) => row.is_active && row.units_sold === 0)
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    range: params.range,
    date_anchor: "orders.created_at",
    trend_granularity: window.trendGranularity,
    included_order_statuses: [
      ...PERFORMANCE_ALWAYS_INCLUDED_ORDER_STATUSES,
      ...PERFORMANCE_CONDITIONAL_ORDER_STATUSES,
    ],
    excluded_order_statuses: PERFORMANCE_EXCLUDED_ORDER_STATUSES,
    margin_available: false,
    stock_available: false,
    summary: {
      units_sold_total: rows.reduce((sum, row) => sum + row.units_sold, 0),
      revenue_total_crc: rows.reduce((sum, row) => sum + row.revenue_crc, 0),
      products_without_sales: rowsWithNoSales.length,
      products_with_commercial_alerts: rows.filter((row) => row.commercial_alert).length,
    },
    rows,
    top_products: {
      units: topUnits,
      revenue: topRevenue,
    },
    sales_trend: trend,
    insights: {
      top_performer_product_id: topRevenue[0]?.product_id ?? null,
      highest_growth_product_id: rowsByGrowth[0]?.id ?? null,
      strongest_drop_product_id: rowsWithDrop.at(-1)?.id ?? null,
      product_without_sales_id: rowsWithNoSales[0]?.id ?? null,
    },
  };
}

import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

import { badRequest, notFound } from "@/server/api/http";
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
  ListCatalogProductsParams,
  ProductAliasMeta,
  ProductDetail,
  ProductDiscountRuleMeta,
  ProductImageMeta,
  ProductSearchTermMeta,
  ProductsCatalogResponse,
  UpdateProductInput,
  UpdateProductImageInput,
  UpdateProductSearchTermInput,
} from "./types";

const PRODUCT_PRICING_MODES = ["fixed", "from", "variable"] as const;

type ProductListRawRow = {
  id: string;
  sku: string;
  family: string;
  name: string;
  category: string;
  variant_label: string | null;
  size_label: string | null;
  pricing_mode: (typeof PRODUCT_PRICING_MODES)[number];
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

type KpiRawRow = {
  total: bigint | number;
  active_products: bigint | number;
  agent_visible_products: bigint | number;
  with_alerts: bigint | number;
  without_primary_image: bigint | number;
};

type ProductUpdateValidationRow = {
  id: string;
  name: string;
  pricing_mode: "fixed" | "from" | "variable";
  price_crc: number | null;
  price_from_crc: number | null;
  min_qty: number | null;
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
  context: Record<string, unknown>,
) {
  try {
    await db.$executeRaw(Prisma.sql`SELECT public.mwl_refresh_product_search_index()`);
  } catch (error) {
    console.error("Failed to refresh mwl product search index", {
      ...context,
      error,
    });
  }
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
  return (
    (input.pricing_mode === "fixed" && input.price_crc != null) ||
    (input.pricing_mode === "from" && input.price_from_crc != null) ||
    (input.pricing_mode === "variable" &&
      (input.price_crc != null || input.price_from_crc != null))
  );
}

function hasPricingModeMismatch(input: {
  pricing_mode: string;
  price_crc: number | null;
  price_from_crc: number | null;
}) {
  return (
    (input.pricing_mode === "fixed" && input.price_crc == null) ||
    (input.pricing_mode === "from" && input.price_from_crc == null)
  );
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
    pricing_mode: row.pricing_mode,
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
          WHEN v.pricing_mode = 'from' THEN v.price_from_crc
          ELSE COALESCE(v.price_crc, v.price_from_crc)
        END
      ) IS NOT NULL
      AND (
        CASE
          WHEN v.pricing_mode = 'fixed' THEN v.price_crc
          WHEN v.pricing_mode = 'from' THEN v.price_from_crc
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

export async function listCatalogProducts(
  params: ListCatalogProductsParams = {},
  options?: ServiceOptions,
): Promise<ProductsCatalogResponse> {
  const db = resolveDb(options);
  const pagination = normalizePagination(params);
  const whereClause = buildBaseWhere(params);

  const [rows, kpiRows, categoryRows, familyRows] = await Promise.all([
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
              OR (v.pricing_mode = 'from' AND v.price_from_crc IS NOT NULL)
              OR (v.pricing_mode = 'variable' AND (v.price_crc IS NOT NULL OR v.price_from_crc IS NOT NULL))
            )
            OR (
              (v.pricing_mode = 'fixed' AND v.price_crc IS NULL)
              OR (v.pricing_mode = 'from' AND v.price_from_crc IS NULL)
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
  ]);

  const kpis = kpiRows[0];
  const total = toCount(kpis?.total);

  return {
    items: rows.map(mapCatalogRow),
    pagination: createPaginationMeta({
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    }),
    filters: {
      categories: categoryRows.map((row) => row.category),
      families: familyRows.map((row) => row.family),
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

  const [images, aliases, searchTerms, discountRules] = await Promise.all([
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
    pricing_mode: row.pricing_mode,
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
    integrity_alerts: base.integrity_alerts,
    ui_created_locally: false,
  };
}

function buildSanitizedUpdateInput(payload: UpdateProductInput): UpdateProductInput {
  const sanitized: UpdateProductInput = {};
  const sanitizedMutable = sanitized as Record<string, unknown>;

  if (payload.name !== undefined) {
    sanitized.name = payload.name.trim();
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

function validateMergedProductForUpdate(input: ProductUpdateValidationRow) {
  if (!input.name.trim()) {
    throw badRequest("name cannot be empty.", { field: "name" });
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

  if (input.pricing_mode === "from" && input.price_from_crc == null) {
    throw badRequest("pricing_mode=from requires price_from_crc.", {
      field: "pricing_mode",
      pricing_mode: input.pricing_mode,
      requiredField: "price_from_crc",
    });
  }
  if (input.pricing_mode === "from" && input.price_crc != null) {
    throw badRequest("pricing_mode=from does not allow price_crc.", {
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
  return {
    ...input,
    is_active: input.is_active ?? true,
    is_agent_visible: input.is_agent_visible ?? true,
    allows_name: input.allows_name ?? false,
    includes_design_adjustment_count: input.includes_design_adjustment_count ?? 0,
    extra_adjustment_has_cost: input.extra_adjustment_has_cost ?? false,
    requires_design_approval: input.requires_design_approval ?? false,
    is_full_color: input.is_full_color ?? false,
    is_premium: input.is_premium ?? false,
    is_discountable: input.is_discountable ?? false,
    discount_visibility: input.discount_visibility ?? "never",
    search_boost: input.search_boost ?? 0,
    sort_order: input.sort_order ?? 0,
  };
}

async function validateCategoryAndFamilyAgainstCatalog(
  db: ReturnType<typeof resolveDb>,
  input: { category: string; family: string },
) {
  const [row] = await db.$queryRaw<Array<{ category_exists: boolean; family_exists: boolean }>>(Prisma.sql`
    SELECT
      EXISTS(
        SELECT 1
        FROM public.mwl_products
        WHERE LOWER(category) = LOWER(${input.category})
      ) AS category_exists,
      EXISTS(
        SELECT 1
        FROM public.mwl_products
        WHERE LOWER(family) = LOWER(${input.family})
      ) AS family_exists
  `);

  if (!row) {
    return;
  }

  if (!row.category_exists) {
    throw badRequest("category must match an existing catalog category.", {
      field: "category",
      category: input.category,
    });
  }

  if (!row.family_exists) {
    throw badRequest("family must match an existing catalog family.", {
      field: "family",
      family: input.family,
    });
  }
}

function generateProductIdBase(input: {
  category: string;
  family: string;
  name: string;
  variant_label: string | null | undefined;
}) {
  const segments = [
    normalizeSlugToken(input.category),
    normalizeSlugToken(input.family),
    normalizeSlugToken(input.name),
    normalizeSlugToken(input.variant_label ?? ""),
  ].filter(Boolean);

  const base = segments.join("_").slice(0, 84).replace(/^_+|_+$/g, "");
  return base || "product";
}

function normalizeSkuFromId(id: string): string {
  let token = id.toUpperCase();
  token = token.replace(/(\d+)_(\d+)(?=X|\b)/g, "$1.$2");
  token = token.replace(/_/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return `MWL-${token}`;
}

function generateProductSkuBase(input: {
  category: string;
  family: string;
  name: string;
  variant_label: string | null | undefined;
  idBase: string;
}) {
  const fallbackSource = generateProductIdBase({
    category: input.category,
    family: input.family,
    name: input.name,
    variant_label: input.variant_label,
  });

  const idLike = fallbackSource || input.idBase;
  return normalizeSkuFromId(idLike).slice(0, 120);
}

async function resolveUniqueProductId(
  db: ReturnType<typeof resolveDb>,
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
    .filter((value): value is number => Number.isInteger(value) && value >= 2);

  const next = (suffixes.length > 0 ? Math.max(...suffixes) : 1) + 1;
  return `${baseId}_${next}`;
}

async function resolveUniqueProductSku(
  db: ReturnType<typeof resolveDb>,
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
  const suffixes = rows
    .map((row) => {
      const match = new RegExp(`^${escapedBaseSku}-(\\d+)$`).exec(row.sku);
      return match ? Number.parseInt(match[1] ?? "", 10) : null;
    })
    .filter((value): value is number => Number.isInteger(value) && value >= 2);

  const next = (suffixes.length > 0 ? Math.max(...suffixes) : 1) + 1;
  return `${baseSku}-${next}`;
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
    pricing_mode: input.pricing_mode,
    price_crc: input.price_crc ?? null,
    price_from_crc: input.price_from_crc ?? null,
    min_qty: input.min_qty,
    is_discountable: input.is_discountable ?? false,
    discount_visibility: input.discount_visibility ?? "never",
  });
}

function shouldRefreshSearchIndex(payload: UpdateProductInput): boolean {
  return (
    payload.name !== undefined ||
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

  const [current] = await db.$queryRaw<ProductUpdateValidationRow[]>(Prisma.sql`
    SELECT
      id,
      name,
      pricing_mode,
      price_crc,
      price_from_crc,
      min_qty,
      is_discountable,
      discount_visibility
    FROM public.mwl_products
    WHERE id = ${productId}
    LIMIT 1
  `);

  if (!current) {
    throw notFound("Product not found.", { productId });
  }

  const mergedValidation: ProductUpdateValidationRow = {
    id: current.id,
    name: sanitized.name ?? current.name,
    pricing_mode: sanitized.pricing_mode ?? current.pricing_mode,
    price_crc:
      sanitized.price_crc !== undefined ? sanitized.price_crc : current.price_crc,
    price_from_crc:
      sanitized.price_from_crc !== undefined
        ? sanitized.price_from_crc
        : current.price_from_crc,
    min_qty: sanitized.min_qty !== undefined ? sanitized.min_qty : current.min_qty,
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
    await refreshSearchIndexSafely(db, { productId, reason: "product_update" });
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

  const baseId = generateProductIdBase({
    category: normalized.category,
    family: normalized.family,
    name: normalized.name,
    variant_label: normalized.variant_label,
  });

  const uniqueId = await resolveUniqueProductId(db, baseId);
  const baseSku = generateProductSkuBase({
    category: normalized.category,
    family: normalized.family,
    name: normalized.name,
    variant_label: normalized.variant_label,
    idBase: uniqueId,
  });
  const uniqueSku = await resolveUniqueProductSku(db, baseSku);

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
      ${normalized.requires_design_approval ?? false},
      ${normalized.is_full_color ?? false},
      ${normalized.is_premium ?? false},
      ${normalized.is_discountable ?? false},
      ${normalized.discount_visibility ?? "never"},
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

  await refreshSearchIndexSafely(db, { productId: uniqueId, reason: "product_create" });
  return getProductDetail(uniqueId, options);
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

export async function addProductSearchTerm(
  productId: string,
  payload: AddProductSearchTermInput,
  options?: ServiceOptions,
): Promise<ProductDetail> {
  const db = resolveDb(options);
  await ensureProductExists(db, productId);

  const normalized = normalizeSearchTermInput(payload);

  const [duplicate] = await db.$queryRaw<Array<{ id: number }>>(Prisma.sql`
    SELECT id::integer AS id
    FROM public.mwl_product_search_terms
    WHERE product_id = ${productId}
      AND LOWER(term) = LOWER(${normalized.term})
    LIMIT 1
  `);

  if (duplicate) {
    throw badRequest("search term already exists for this product.", { field: "term" });
  }

  await db.$executeRaw(Prisma.sql`
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

  const [existing] = await db.$queryRaw<Array<{
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

  const [duplicate] = await db.$queryRaw<Array<{ id: number }>>(Prisma.sql`
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

  await db.$executeRaw(Prisma.sql`
    UPDATE public.mwl_product_search_terms
    SET
      term = ${merged.term},
      term_type = ${merged.term_type},
      priority = ${merged.priority},
      is_active = ${merged.is_active},
      notes = ${merged.notes}
    WHERE id = ${termId} AND product_id = ${productId}
  `);

  await refreshSearchIndexSafely(db, { productId, reason: "search_term_update" });
  return getProductDetail(productId, options);
}

export async function deleteProductSearchTerm(
  productId: string,
  termId: number,
  options?: ServiceOptions,
): Promise<ProductDetail> {
  const db = resolveDb(options);

  const [found] = await db.$queryRaw<Array<{ id: number }>>(Prisma.sql`
    SELECT id::integer AS id
    FROM public.mwl_product_search_terms
    WHERE id = ${termId} AND product_id = ${productId}
    LIMIT 1
  `);

  if (!found) {
    throw notFound("Product search term not found for this product.", { productId, termId });
  }

  await db.$executeRaw(Prisma.sql`
    DELETE FROM public.mwl_product_search_terms
    WHERE id = ${termId} AND product_id = ${productId}
  `);

  await refreshSearchIndexSafely(db, { productId, reason: "search_term_delete" });
  return getProductDetail(productId, options);
}

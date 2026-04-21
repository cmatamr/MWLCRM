import { Prisma } from "@prisma/client";

import { normalizeTimeZoneName, parseDateTimeInputToUtcDate } from "@/lib/date-timezone";
import { badRequest, conflict, notFound } from "@/server/api/http";
import {
  createPaginationMeta,
  normalizePagination,
  resolveDb,
  type ServiceOptions,
} from "@/server/services/shared";

import type {
  ListPromotionsParams,
  PromotionBlockPrice,
  PromotionBlockPriceInput,
  PromotionDetail,
  PromotionRangePrice,
  PromotionRangePriceInput,
  PromotionRow,
  PromotionVisualStatus,
  PromotionsListResponse,
  SavePromotionInput,
  TogglePromotionInput,
} from "./types";

type PromotionRawRow = {
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
  promo_type: "blocks" | "ranges";
  is_enabled: boolean;
  agent_visible: boolean;
  starts_at: Date | string;
  ends_at: Date | string;
  timezone_name: string;
  min_promo_qty: number;
  block_size: number | null;
  top_block_qty: number | null;
  post_top_block_price_crc: number | null;
  notes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type CountRow = { total: bigint | number };

type BlockRawRow = {
  id: bigint | number;
  promotion_id: string;
  exact_qty: number;
  total_price_crc: number;
  sort_order: number;
  is_active: boolean;
  created_at: Date | string;
};

type RangeRawRow = {
  id: bigint | number;
  promotion_id: string;
  range_min_qty: number;
  range_max_qty: number | null;
  unit_price_crc: number;
  sort_order: number;
  is_active: boolean;
  created_at: Date | string;
};

type SqlDbClient = {
  $queryRaw: ReturnType<typeof resolveDb>["$queryRaw"];
  $executeRaw: ReturnType<typeof resolveDb>["$executeRaw"];
};

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toInt(value: bigint | number): number {
  return Number(value);
}

function normalizeText(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw badRequest("Campo requerido.");
  }

  return trimmed;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function ensurePositiveInt(value: number, field: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw badRequest(`${field} debe ser un entero mayor que 0.`, { field, value });
  }
}

function ensureStartsBeforeEnds(startsAt: Date, endsAt: Date): void {
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw badRequest("Fechas inválidas.");
  }

  if (startsAt >= endsAt) {
    throw badRequest("La fecha de inicio debe ser menor a la fecha de fin.");
  }
}

function toPromotionBlock(row: BlockRawRow): PromotionBlockPrice {
  return {
    id: toInt(row.id),
    promotion_id: row.promotion_id,
    exact_qty: row.exact_qty,
    total_price_crc: row.total_price_crc,
    sort_order: row.sort_order,
    is_active: row.is_active,
    created_at: toIso(row.created_at),
  };
}

function toPromotionRange(row: RangeRawRow): PromotionRangePrice {
  return {
    id: toInt(row.id),
    promotion_id: row.promotion_id,
    range_min_qty: row.range_min_qty,
    range_max_qty: row.range_max_qty,
    unit_price_crc: row.unit_price_crc,
    sort_order: row.sort_order,
    is_active: row.is_active,
    created_at: toIso(row.created_at),
  };
}

function detectIntegrityIssues(input: {
  promoType: "blocks" | "ranges";
  minPromoQty: number;
  blockSize: number | null;
  topBlockQty: number | null;
  postTopBlockPriceCrc: number | null;
  blocks: PromotionBlockPrice[];
  ranges: PromotionRangePrice[];
}): string[] {
  const issues: string[] = [];

  if (input.minPromoQty <= 0) {
    issues.push("Cantidad mínima inválida.");
  }

  if (input.promoType === "blocks") {
    if (!input.blockSize || input.blockSize <= 0) {
      issues.push("Tamaño del paquete inválido.");
    }
    if (!input.topBlockQty || input.topBlockQty <= 0) {
      issues.push("Cantidad máxima con precio especial inválida.");
    }
    if (!input.postTopBlockPriceCrc || input.postTopBlockPriceCrc <= 0) {
      issues.push("Precio por paquete adicional inválido.");
    }

    const activeBlocks = input.blocks.filter((item) => item.is_active);
    if (activeBlocks.length === 0) {
      issues.push("No hay bloques activos.");
    }
  }

  if (input.promoType === "ranges") {
    const activeRanges = input.ranges.filter((item) => item.is_active);
    if (activeRanges.length === 0) {
      issues.push("No hay rangos activos.");
    }
  }

  return issues;
}

function computeVisualStatus(input: {
  isEnabled: boolean;
  startsAt: string;
  endsAt: string;
  integrityIssues: string[];
}): PromotionVisualStatus {
  if (input.integrityIssues.length > 0) {
    return "integrity_error";
  }

  if (!input.isEnabled) {
    return "inactive";
  }

  const now = Date.now();
  const startsAt = new Date(input.startsAt).getTime();
  const endsAt = new Date(input.endsAt).getTime();

  if (now < startsAt) {
    return "scheduled";
  }

  if (now > endsAt) {
    return "expired";
  }

  return "active_current";
}

function isCurrentlyActive(input: { isEnabled: boolean; startsAt: string; endsAt: string }): boolean {
  if (!input.isEnabled) {
    return false;
  }

  const now = Date.now();
  const startsAt = new Date(input.startsAt).getTime();
  const endsAt = new Date(input.endsAt).getTime();

  return now >= startsAt && now <= endsAt;
}

function buildOperationalSummary(input: {
  promoType: "blocks" | "ranges";
  minPromoQty: number;
  blockSize: number | null;
  topBlockQty: number | null;
  postTopBlockPriceCrc: number | null;
  blocks: PromotionBlockPrice[];
  ranges: PromotionRangePrice[];
}): string[] {
  const summary: string[] = [];

  summary.push(`Debajo de ${input.minPromoQty} unidades aplica precio base.`);

  if (input.promoType === "blocks") {
    if (input.blockSize != null && input.topBlockQty != null) {
      summary.push(
        `Desde ${input.minPromoQty} hasta ${input.topBlockQty} aplica promo por bloques de ${input.blockSize}.`,
      );
    }

    if (input.postTopBlockPriceCrc != null) {
      summary.push(`Mayor al tope aplica precio por paquete adicional de ₡${input.postTopBlockPriceCrc}.`);
    }

    const activeBlocks = input.blocks.filter((item) => item.is_active).sort((a, b) => a.exact_qty - b.exact_qty);
    if (activeBlocks.length > 0) {
      summary.push(
        `Bloques exactos activos: ${activeBlocks
          .map((item) => `${item.exact_qty}u -> ₡${item.total_price_crc}`)
          .join(" | ")}.`,
      );
    }

    return summary;
  }

  const activeRanges = input.ranges.filter((item) => item.is_active).sort((a, b) => a.range_min_qty - b.range_min_qty);
  if (activeRanges.length > 0) {
    summary.push(
      `Rangos activos: ${activeRanges
        .map((item) =>
          item.range_max_qty == null
            ? `${item.range_min_qty}+ -> ₡${item.unit_price_crc} por unidad`
            : `${item.range_min_qty}-${item.range_max_qty} -> ₡${item.unit_price_crc} por unidad`,
        )
        .join(" | ")}.`,
    );
  }

  return summary;
}

function escapeLikePattern(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

async function getBlocksByPromotionId(db: SqlDbClient, promotionId: string) {
  const rows = await db.$queryRaw<BlockRawRow[]>(Prisma.sql`
    SELECT
      id,
      promotion_id,
      exact_qty,
      total_price_crc,
      sort_order,
      is_active,
      created_at
    FROM public.mwl_product_promotion_block_prices
    WHERE promotion_id = ${promotionId}::uuid
    ORDER BY sort_order ASC, exact_qty ASC, id ASC
  `);

  return rows.map(toPromotionBlock);
}

async function getRangesByPromotionId(db: SqlDbClient, promotionId: string) {
  const rows = await db.$queryRaw<RangeRawRow[]>(Prisma.sql`
    SELECT
      id,
      promotion_id,
      range_min_qty,
      range_max_qty,
      unit_price_crc,
      sort_order,
      is_active,
      created_at
    FROM public.mwl_product_promotion_range_prices
    WHERE promotion_id = ${promotionId}::uuid
    ORDER BY sort_order ASC, range_min_qty ASC, id ASC
  `);

  return rows.map(toPromotionRange);
}

function validateBlockPayload(input: {
  minPromoQty: number;
  blockSize: number | null | undefined;
  topBlockQty: number | null | undefined;
  postTopBlockPriceCrc: number | null | undefined;
  blocks: PromotionBlockPriceInput[] | undefined;
}): void {
  ensurePositiveInt(input.minPromoQty, "Cantidad mínima para aplicar promoción");

  if (input.blockSize == null) {
    throw badRequest("Tamaño del paquete es obligatorio para promociones por bloques.");
  }

  if (input.topBlockQty == null) {
    throw badRequest("Cantidad máxima con precio especial es obligatoria para promociones por bloques.");
  }

  if (input.postTopBlockPriceCrc == null) {
    throw badRequest("Precio por paquete adicional es obligatorio para promociones por bloques.");
  }

  ensurePositiveInt(input.blockSize, "Tamaño del paquete");
  ensurePositiveInt(input.topBlockQty, "Cantidad máxima con precio especial");
  ensurePositiveInt(input.postTopBlockPriceCrc, "Precio por paquete adicional");

  const blocks = input.blocks ?? [];
  if (blocks.length === 0) {
    throw badRequest("Debes agregar al menos un bloque exacto.");
  }

  const seenQty = new Set<number>();

  for (const item of blocks) {
    ensurePositiveInt(item.exact_qty, "Cantidad exacta del bloque");
    ensurePositiveInt(item.total_price_crc, "Precio total del bloque");

    if (item.exact_qty % input.blockSize !== 0) {
      throw badRequest("Cada cantidad exacta debe ser múltiplo del tamaño del paquete.");
    }

    if (item.exact_qty < input.minPromoQty) {
      throw badRequest("Cada cantidad exacta debe ser mayor o igual al mínimo promocional.");
    }

    if (item.exact_qty > input.topBlockQty) {
      throw badRequest("Cada cantidad exacta debe ser menor o igual a la cantidad máxima con precio especial.");
    }

    if (seenQty.has(item.exact_qty)) {
      throw badRequest("No puedes repetir cantidades exactas dentro de la misma promoción.");
    }

    seenQty.add(item.exact_qty);
  }
}

function rangesOverlap(leftMin: number, leftMax: number | null, rightMin: number, rightMax: number | null): boolean {
  const effectiveLeftMax = leftMax ?? Number.POSITIVE_INFINITY;
  const effectiveRightMax = rightMax ?? Number.POSITIVE_INFINITY;

  return leftMin <= effectiveRightMax && rightMin <= effectiveLeftMax;
}

function validateRangePayload(input: {
  minPromoQty: number;
  ranges: PromotionRangePriceInput[] | undefined;
}): void {
  ensurePositiveInt(input.minPromoQty, "Cantidad mínima para aplicar promoción");

  const ranges = input.ranges ?? [];

  if (ranges.length === 0) {
    throw badRequest("Debes agregar al menos un rango.");
  }

  let openEndedCount = 0;

  ranges.forEach((item) => {
    ensurePositiveInt(item.range_min_qty, "Cantidad desde");
    ensurePositiveInt(item.unit_price_crc, "Precio por unidad");

    if (item.range_min_qty < input.minPromoQty) {
      throw badRequest("Los rangos deben iniciar desde la cantidad mínima promocional o superior.");
    }

    if (item.range_max_qty != null && (!Number.isInteger(item.range_max_qty) || item.range_max_qty < item.range_min_qty)) {
      throw badRequest("Cantidad hasta debe ser mayor o igual que cantidad desde.");
    }

    if (item.range_max_qty == null) {
      openEndedCount += 1;
    }
  });

  if (openEndedCount > 1) {
    throw badRequest("Solo se permite un rango abierto superior por promoción.");
  }

  const sorted = [...ranges].sort((a, b) => a.range_min_qty - b.range_min_qty);

  for (let index = 0; index < sorted.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < sorted.length; nextIndex += 1) {
      const left = sorted[index];
      const right = sorted[nextIndex];

      if (!left || !right) {
        continue;
      }

      if (rangesOverlap(left.range_min_qty, left.range_max_qty, right.range_min_qty, right.range_max_qty)) {
        throw badRequest("No se permiten solapamientos entre rangos.");
      }
    }
  }
}

async function assertProductExists(db: SqlDbClient, productId: string): Promise<void> {
  const rows = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id
    FROM public.mwl_products
    WHERE id = ${productId}
    LIMIT 1
  `);

  if (rows.length === 0) {
    throw badRequest("Producto no encontrado para esta promoción.", { product_id: productId });
  }
}

async function assertNoEnabledOverlap(input: {
  db: SqlDbClient;
  productId: string;
  startsAt: Date;
  endsAt: Date;
  isEnabled: boolean;
  promotionId?: string;
}): Promise<void> {
  if (!input.isEnabled) {
    return;
  }

  const rows = await input.db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT p.id
    FROM public.mwl_product_promotions p
    WHERE p.product_id = ${input.productId}
      AND p.is_enabled = true
      AND (${input.promotionId ?? null}::uuid IS NULL OR p.id <> ${input.promotionId ?? null}::uuid)
      AND tstzrange(p.starts_at, p.ends_at, '[]') && tstzrange(${input.startsAt.toISOString()}::timestamptz, ${input.endsAt.toISOString()}::timestamptz, '[]')
    LIMIT 1
  `);

  if (rows.length > 0) {
    throw conflict("Ya existe una promoción activa para este producto en ese rango de fechas.");
  }
}

function validateSavePayload(input: SavePromotionInput): {
  normalizedName: string;
  normalizedTimezone: string;
  normalizedNotes: string | null;
  startsAt: Date;
  endsAt: Date;
} {
  const normalizedName = normalizeText(input.name);
  const timezoneInput = normalizeText(input.timezone_name);
  const normalizedNotes = normalizeOptionalText(input.notes);
  let normalizedTimezone: string;

  ensurePositiveInt(input.min_promo_qty, "Cantidad mínima para aplicar promoción");

  try {
    normalizedTimezone = normalizeTimeZoneName(timezoneInput);
  } catch {
    throw badRequest("Zona horaria inválida.", { timezone_name: timezoneInput });
  }

  let startsAt: Date;
  let endsAt: Date;

  try {
    startsAt = parseDateTimeInputToUtcDate({
      value: input.starts_at,
      timeZone: normalizedTimezone,
    });
    endsAt = parseDateTimeInputToUtcDate({
      value: input.ends_at,
      timeZone: normalizedTimezone,
    });
  } catch {
    throw badRequest("Debes indicar fechas válidas para inicio y fin.");
  }

  ensureStartsBeforeEnds(startsAt, endsAt);

  if (input.promo_type === "blocks") {
    validateBlockPayload({
      minPromoQty: input.min_promo_qty,
      blockSize: input.block_size,
      topBlockQty: input.top_block_qty,
      postTopBlockPriceCrc: input.post_top_block_price_crc,
      blocks: input.block_prices,
    });
  }

  if (input.promo_type === "ranges") {
    validateRangePayload({
      minPromoQty: input.min_promo_qty,
      ranges: input.range_prices,
    });
  }

  return {
    normalizedName,
    normalizedTimezone,
    normalizedNotes,
    startsAt,
    endsAt,
  };
}

async function insertBlockRows(
  db: SqlDbClient,
  promotionId: string,
  blocks: PromotionBlockPriceInput[],
): Promise<void> {
  for (const [index, item] of blocks.entries()) {
    await db.$executeRaw(Prisma.sql`
      INSERT INTO public.mwl_product_promotion_block_prices (
        promotion_id,
        exact_qty,
        total_price_crc,
        sort_order,
        is_active
      )
      VALUES (
        ${promotionId}::uuid,
        ${item.exact_qty},
        ${item.total_price_crc},
        ${item.sort_order ?? index},
        ${item.is_active ?? true}
      )
    `);
  }
}

async function insertRangeRows(
  db: SqlDbClient,
  promotionId: string,
  ranges: PromotionRangePriceInput[],
): Promise<void> {
  for (const [index, item] of ranges.entries()) {
    await db.$executeRaw(Prisma.sql`
      INSERT INTO public.mwl_product_promotion_range_prices (
        promotion_id,
        range_min_qty,
        range_max_qty,
        unit_price_crc,
        sort_order,
        is_active
      )
      VALUES (
        ${promotionId}::uuid,
        ${item.range_min_qty},
        ${item.range_max_qty},
        ${item.unit_price_crc},
        ${item.sort_order ?? index},
        ${item.is_active ?? true}
      )
    `);
  }
}

async function getPromotionRawById(db: SqlDbClient, id: string) {
  const rows = await db.$queryRaw<PromotionRawRow[]>(Prisma.sql`
    SELECT
      p.id,
      p.product_id,
      prod.name AS product_name,
      prod.sku,
      prod.category,
      prod.family,
      CASE
        WHEN prod.pricing_mode = 'fixed' THEN prod.price_crc
        WHEN prod.pricing_mode = 'from' THEN prod.price_from_crc
        ELSE COALESCE(prod.price_crc, prod.price_from_crc)
      END AS base_price_crc,
      prod.is_active AS product_is_active,
      prod.is_agent_visible AS product_is_agent_visible,
      p.name,
      p.promo_type,
      p.is_enabled,
      p.agent_visible,
      p.starts_at,
      p.ends_at,
      p.timezone_name,
      p.min_promo_qty,
      p.block_size,
      p.top_block_qty,
      p.post_top_block_price_crc,
      p.notes,
      p.created_at,
      p.updated_at
    FROM public.mwl_product_promotions p
    INNER JOIN public.mwl_products prod ON prod.id = p.product_id
    WHERE p.id = ${id}::uuid
    LIMIT 1
  `);

  return rows[0] ?? null;
}

function toPromotionRow(input: {
  base: PromotionRawRow;
  blockPrices: PromotionBlockPrice[];
  rangePrices: PromotionRangePrice[];
}): PromotionRow {
  const startsAt = toIso(input.base.starts_at);
  const endsAt = toIso(input.base.ends_at);

  const integrityIssues = detectIntegrityIssues({
    promoType: input.base.promo_type,
    minPromoQty: input.base.min_promo_qty,
    blockSize: input.base.block_size,
    topBlockQty: input.base.top_block_qty,
    postTopBlockPriceCrc: input.base.post_top_block_price_crc,
    blocks: input.blockPrices,
    ranges: input.rangePrices,
  });

  return {
    id: input.base.id,
    product_id: input.base.product_id,
    product_name: input.base.product_name,
    sku: input.base.sku,
    category: input.base.category,
    family: input.base.family,
    base_price_crc: input.base.base_price_crc,
    product_is_active: input.base.product_is_active,
    product_is_agent_visible: input.base.product_is_agent_visible,
    name: input.base.name,
    promo_type: input.base.promo_type,
    is_enabled: input.base.is_enabled,
    agent_visible: input.base.agent_visible,
    starts_at: startsAt,
    ends_at: endsAt,
    timezone_name: input.base.timezone_name,
    min_promo_qty: input.base.min_promo_qty,
    block_size: input.base.block_size,
    top_block_qty: input.base.top_block_qty,
    post_top_block_price_crc: input.base.post_top_block_price_crc,
    notes: input.base.notes,
    created_at: toIso(input.base.created_at),
    updated_at: toIso(input.base.updated_at),
    vigente: isCurrentlyActive({
      isEnabled: input.base.is_enabled,
      startsAt,
      endsAt,
    }),
    visual_status: computeVisualStatus({
      isEnabled: input.base.is_enabled,
      startsAt,
      endsAt,
      integrityIssues,
    }),
    integrity_issues: integrityIssues,
  };
}

export async function listPromotions(
  params?: ListPromotionsParams,
  options?: ServiceOptions,
): Promise<PromotionsListResponse> {
  const db = resolveDb(options);
  const pagination = normalizePagination(params);

  const search = params?.search?.trim() ? escapeLikePattern(params.search.trim()) : null;

  const whereParts: Prisma.Sql[] = [];

  if (search) {
    whereParts.push(Prisma.sql`(
      p.name ILIKE ${`%${search}%`} ESCAPE '\\'
      OR prod.name ILIKE ${`%${search}%`} ESCAPE '\\'
      OR prod.sku ILIKE ${`%${search}%`} ESCAPE '\\'
    )`);
  }

  if (params?.promoType) {
    whereParts.push(Prisma.sql`p.promo_type = ${params.promoType}::public.mwl_promo_type`);
  }

  if (params?.agentVisible != null) {
    whereParts.push(Prisma.sql`p.agent_visible = ${params.agentVisible}`);
  }

  if (params?.isEnabled != null) {
    whereParts.push(Prisma.sql`p.is_enabled = ${params.isEnabled}`);
  }

  const whereSql =
    whereParts.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(whereParts, " AND ")}`
      : Prisma.empty;

  const rows = await db.$queryRaw<PromotionRawRow[]>(Prisma.sql`
    SELECT
      p.id,
      p.product_id,
      prod.name AS product_name,
      prod.sku,
      prod.category,
      prod.family,
      CASE
        WHEN prod.pricing_mode = 'fixed' THEN prod.price_crc
        WHEN prod.pricing_mode = 'from' THEN prod.price_from_crc
        ELSE COALESCE(prod.price_crc, prod.price_from_crc)
      END AS base_price_crc,
      prod.is_active AS product_is_active,
      prod.is_agent_visible AS product_is_agent_visible,
      p.name,
      p.promo_type,
      p.is_enabled,
      p.agent_visible,
      p.starts_at,
      p.ends_at,
      p.timezone_name,
      p.min_promo_qty,
      p.block_size,
      p.top_block_qty,
      p.post_top_block_price_crc,
      p.notes,
      p.created_at,
      p.updated_at
    FROM public.mwl_product_promotions p
    INNER JOIN public.mwl_products prod ON prod.id = p.product_id
    ${whereSql}
    ORDER BY p.updated_at DESC, p.created_at DESC
    LIMIT ${pagination.take}
    OFFSET ${pagination.skip}
  `);

  const countRows = await db.$queryRaw<CountRow[]>(Prisma.sql`
    SELECT COUNT(*) AS total
    FROM public.mwl_product_promotions p
    INNER JOIN public.mwl_products prod ON prod.id = p.product_id
    ${whereSql}
  `);

  const items: PromotionRow[] = [];

  for (const row of rows) {
    const [blockPrices, rangePrices] = await Promise.all([
      getBlocksByPromotionId(db, row.id),
      getRangesByPromotionId(db, row.id),
    ]);

    const mapped = toPromotionRow({
      base: row,
      blockPrices,
      rangePrices,
    });

    if (params?.status && params.status !== "all" && mapped.visual_status !== params.status) {
      continue;
    }

    items.push(mapped);
  }

  return {
    items,
    pagination: createPaginationMeta({
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: Number(countRows[0]?.total ?? 0),
    }),
  };
}

export async function getPromotionDetail(id: string, options?: ServiceOptions): Promise<PromotionDetail> {
  const db = resolveDb(options);

  const raw = await getPromotionRawById(db, id);

  if (!raw) {
    throw notFound("Promoción no encontrada.", { id });
  }

  const [blockPrices, rangePrices] = await Promise.all([
    getBlocksByPromotionId(db, id),
    getRangesByPromotionId(db, id),
  ]);

  const base = toPromotionRow({
    base: raw,
    blockPrices,
    rangePrices,
  });

  return {
    ...base,
    block_prices: blockPrices,
    range_prices: rangePrices,
    operational_summary: buildOperationalSummary({
      promoType: base.promo_type,
      minPromoQty: base.min_promo_qty,
      blockSize: base.block_size,
      topBlockQty: base.top_block_qty,
      postTopBlockPriceCrc: base.post_top_block_price_crc,
      blocks: blockPrices,
      ranges: rangePrices,
    }),
  };
}

export async function createPromotion(
  input: SavePromotionInput,
  options?: ServiceOptions,
): Promise<PromotionDetail> {
  const db = resolveDb(options);

  const validated = validateSavePayload(input);
  await assertProductExists(db, input.product_id);
  await assertNoEnabledOverlap({
    db,
    productId: input.product_id,
    startsAt: validated.startsAt,
    endsAt: validated.endsAt,
    isEnabled: input.is_enabled,
  });

  const createdId = await db.$transaction(async (tx) => {
    const inserted = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      INSERT INTO public.mwl_product_promotions (
        product_id,
        name,
        promo_type,
        is_enabled,
        agent_visible,
        starts_at,
        ends_at,
        timezone_name,
        min_promo_qty,
        block_size,
        top_block_qty,
        post_top_block_price_crc,
        notes
      )
      VALUES (
        ${input.product_id},
        ${validated.normalizedName},
        ${input.promo_type}::public.mwl_promo_type,
        ${input.is_enabled},
        ${input.agent_visible},
        ${validated.startsAt.toISOString()}::timestamptz,
        ${validated.endsAt.toISOString()}::timestamptz,
        ${validated.normalizedTimezone},
        ${input.min_promo_qty},
        ${input.promo_type === "blocks" ? input.block_size ?? null : null},
        ${input.promo_type === "blocks" ? input.top_block_qty ?? null : null},
        ${input.promo_type === "blocks" ? input.post_top_block_price_crc ?? null : null},
        ${validated.normalizedNotes}
      )
      RETURNING id
    `);

    const promotionId = inserted[0]?.id;

    if (!promotionId) {
      throw badRequest("No se pudo crear la promoción.");
    }

    if (input.promo_type === "blocks") {
      await insertBlockRows(tx, promotionId, input.block_prices ?? []);
    }

    if (input.promo_type === "ranges") {
      await insertRangeRows(tx, promotionId, input.range_prices ?? []);
    }

    return promotionId;
  });

  return getPromotionDetail(createdId, { db });
}

export async function updatePromotion(
  id: string,
  input: SavePromotionInput,
  options?: ServiceOptions,
): Promise<PromotionDetail> {
  const db = resolveDb(options);
  const existing = await getPromotionRawById(db, id);

  if (!existing) {
    throw notFound("Promoción no encontrada.", { id });
  }

  const validated = validateSavePayload(input);
  await assertProductExists(db, input.product_id);
  await assertNoEnabledOverlap({
    db,
    productId: input.product_id,
    startsAt: validated.startsAt,
    endsAt: validated.endsAt,
    isEnabled: input.is_enabled,
    promotionId: id,
  });

  await db.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      UPDATE public.mwl_product_promotions
      SET
        product_id = ${input.product_id},
        name = ${validated.normalizedName},
        promo_type = ${input.promo_type}::public.mwl_promo_type,
        is_enabled = ${input.is_enabled},
        agent_visible = ${input.agent_visible},
        starts_at = ${validated.startsAt.toISOString()}::timestamptz,
        ends_at = ${validated.endsAt.toISOString()}::timestamptz,
        timezone_name = ${validated.normalizedTimezone},
        min_promo_qty = ${input.min_promo_qty},
        block_size = ${input.promo_type === "blocks" ? input.block_size ?? null : null},
        top_block_qty = ${input.promo_type === "blocks" ? input.top_block_qty ?? null : null},
        post_top_block_price_crc = ${input.promo_type === "blocks" ? input.post_top_block_price_crc ?? null : null},
        notes = ${validated.normalizedNotes},
        updated_at = now()
      WHERE id = ${id}::uuid
    `);

    await tx.$executeRaw(Prisma.sql`
      DELETE FROM public.mwl_product_promotion_block_prices
      WHERE promotion_id = ${id}::uuid
    `);

    await tx.$executeRaw(Prisma.sql`
      DELETE FROM public.mwl_product_promotion_range_prices
      WHERE promotion_id = ${id}::uuid
    `);

    if (input.promo_type === "blocks") {
      await insertBlockRows(tx, id, input.block_prices ?? []);
    }

    if (input.promo_type === "ranges") {
      await insertRangeRows(tx, id, input.range_prices ?? []);
    }
  });

  return getPromotionDetail(id, { db });
}

export async function setPromotionEnabled(
  id: string,
  input: TogglePromotionInput,
  options?: ServiceOptions,
): Promise<PromotionDetail> {
  const db = resolveDb(options);
  const existing = await getPromotionRawById(db, id);

  if (!existing) {
    throw notFound("Promoción no encontrada.", { id });
  }

  const startsAt = new Date(existing.starts_at);
  const endsAt = new Date(existing.ends_at);

  await assertNoEnabledOverlap({
    db,
    productId: existing.product_id,
    startsAt,
    endsAt,
    isEnabled: input.is_enabled,
    promotionId: id,
  });

  await db.$executeRaw(Prisma.sql`
    UPDATE public.mwl_product_promotions
    SET
      is_enabled = ${input.is_enabled},
      updated_at = now()
    WHERE id = ${id}::uuid
  `);

  return getPromotionDetail(id, { db });
}

export async function duplicatePromotion(id: string, options?: ServiceOptions): Promise<PromotionDetail> {
  const db = resolveDb(options);
  const detail = await getPromotionDetail(id, { db });

  const copied = await createPromotion(
    {
      product_id: detail.product_id,
      name: `${detail.name} (Copia)`,
      promo_type: detail.promo_type,
      is_enabled: false,
      agent_visible: detail.agent_visible,
      starts_at: detail.starts_at,
      ends_at: detail.ends_at,
      timezone_name: detail.timezone_name,
      min_promo_qty: detail.min_promo_qty,
      block_size: detail.block_size,
      top_block_qty: detail.top_block_qty,
      post_top_block_price_crc: detail.post_top_block_price_crc,
      notes: detail.notes,
      block_prices: detail.block_prices.map((item, index) => ({
        exact_qty: item.exact_qty,
        total_price_crc: item.total_price_crc,
        sort_order: item.sort_order ?? index,
        is_active: item.is_active,
      })),
      range_prices: detail.range_prices.map((item, index) => ({
        range_min_qty: item.range_min_qty,
        range_max_qty: item.range_max_qty,
        unit_price_crc: item.unit_price_crc,
        sort_order: item.sort_order ?? index,
        is_active: item.is_active,
      })),
    },
    { db },
  );

  return copied;
}

export async function deletePromotion(id: string, options?: ServiceOptions): Promise<{ deleted: true; id: string }> {
  const db = resolveDb(options);
  const existing = await getPromotionRawById(db, id);

  if (!existing) {
    throw notFound("Promoción no encontrada.", { id });
  }

  if (existing.is_enabled) {
    throw badRequest("Desactiva la promoción antes de eliminarla para proteger la integridad operativa.");
  }

  await db.$executeRaw(Prisma.sql`
    DELETE FROM public.mwl_product_promotions
    WHERE id = ${id}::uuid
  `);

  return {
    deleted: true,
    id,
  };
}

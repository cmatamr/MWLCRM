"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, CircleDot, Copy, Pencil, Search, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { StateDisplay, TableEmptyStateRow } from "@/components/ui/state-display";
import { StatusBadge } from "@/components/ui/status-badge";
import { useProductsCatalog, usePromotionDetail, usePromotionMutations, usePromotions } from "@/hooks";
import { crmApiClient } from "@/lib/api/crm";
import {
  formatDateToDateTimeLocalInTimeZone,
  parseDateTimeInputToUtcDate,
} from "@/lib/date-timezone";
import { formatCurrencyCRC, formatDateTime } from "@/lib/formatters";
import type {
  PromotionBlockPriceInput,
  PromotionDetail,
  PromotionRangePriceInput,
  PromotionRow,
  PromotionVisualStatus,
  SavePromotionInput,
} from "@/server/services/promotions";

type PromotionDraft = {
  productId: string;
  name: string;
  promoType: "blocks" | "ranges";
  isEnabled: boolean;
  agentVisible: boolean;
  startsAt: string;
  endsAt: string;
  timezoneName: string;
  minPromoQty: string;
  notes: string;
  blockSize: string;
  topBlockQty: string;
  postTopBlockPriceCrc: string;
  blockPrices: PromotionBlockPriceInput[];
  rangePrices: PromotionRangePriceInput[];
};

type PromotionSimulation = {
  requestedQty: number | null;
  quotedQty: number | null;
  promotionTypeLabel: string;
  priceApplicationLabel: string;
  calculationTypeLabel: string;
  unitPriceCrc: number | null;
  totalCrc: number | null;
  explanation: string;
};

const supabaseProjectUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/g, "");
const DEFAULT_PROMOTION_TIME_ZONE = "America/Costa_Rica";

function buildStoragePublicUrl(storageBucket: string | null, storagePath: string | null) {
  if (!supabaseProjectUrl || !storageBucket || !storagePath) {
    return null;
  }

  const bucket = storageBucket.trim().replace(/^\/+|\/+$/g, "");
  const path = storagePath
    .trim()
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  if (!bucket || !path) {
    return null;
  }

  return `${supabaseProjectUrl}/storage/v1/object/public/${bucket}/${path}`;
}

function toDateTimeLocalInputInTimeZone(value: Date | string, timeZone: string): string {
  try {
    return formatDateToDateTimeLocalInTimeZone({
      date: value,
      timeZone,
    });
  } catch {
    return formatDateToDateTimeLocalInTimeZone({
      date: value,
      timeZone: DEFAULT_PROMOTION_TIME_ZONE,
    });
  }
}

function parseDateInputInTimeZone(value: string, timeZone: string): Date | null {
  try {
    return parseDateTimeInputToUtcDate({
      value,
      timeZone,
    });
  } catch {
    return null;
  }
}

function defaultDraft(): PromotionDraft {
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + 24 * 60 * 60 * 1000);

  return {
    productId: "",
    name: "",
    promoType: "blocks",
    isEnabled: false,
    agentVisible: true,
    startsAt: toDateTimeLocalInputInTimeZone(startsAt, DEFAULT_PROMOTION_TIME_ZONE),
    endsAt: toDateTimeLocalInputInTimeZone(endsAt, DEFAULT_PROMOTION_TIME_ZONE),
    timezoneName: DEFAULT_PROMOTION_TIME_ZONE,
    minPromoQty: "1",
    notes: "",
    blockSize: "",
    topBlockQty: "",
    postTopBlockPriceCrc: "",
    blockPrices: [],
    rangePrices: [],
  };
}

function draftFromPromotion(detail: PromotionDetail): PromotionDraft {
  const timeZone = detail.timezone_name?.trim() || DEFAULT_PROMOTION_TIME_ZONE;

  return {
    productId: detail.product_id,
    name: detail.name,
    promoType: detail.promo_type,
    isEnabled: detail.is_enabled,
    agentVisible: detail.agent_visible,
    startsAt: toDateTimeLocalInputInTimeZone(detail.starts_at, timeZone),
    endsAt: toDateTimeLocalInputInTimeZone(detail.ends_at, timeZone),
    timezoneName: timeZone,
    minPromoQty: String(detail.min_promo_qty),
    notes: detail.notes ?? "",
    blockSize: detail.block_size != null ? String(detail.block_size) : "",
    topBlockQty: detail.top_block_qty != null ? String(detail.top_block_qty) : "",
    postTopBlockPriceCrc:
      detail.post_top_block_price_crc != null ? String(detail.post_top_block_price_crc) : "",
    blockPrices: detail.block_prices.map((item) => ({
      exact_qty: item.exact_qty,
      total_price_crc: item.total_price_crc,
      sort_order: item.sort_order,
      is_active: item.is_active,
    })),
    rangePrices: detail.range_prices.map((item) => ({
      range_min_qty: item.range_min_qty,
      range_max_qty: item.range_max_qty,
      unit_price_crc: item.unit_price_crc,
      sort_order: item.sort_order,
      is_active: item.is_active,
    })),
  };
}

function parseIntStrict(value: string, label: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed)) {
    throw new Error(`${label} debe ser un entero válido.`);
  }

  return parsed;
}

function parseCurrencyVisualInput(value: string): number | null {
  const normalized = value.trim().replaceAll(",", "");

  if (!normalized) {
    return null;
  }

  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.trunc(parsed);
}

function formatCurrencyVisual(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function parsePositiveIntOrNull(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function createBasePriceSimulation(input: {
  requestedQty: number;
  baseUnitPriceCrc: number | null;
  promotionTypeLabel: string;
  explanation: string;
  calculationTypeLabel?: string;
}): PromotionSimulation {
  return {
    requestedQty: input.requestedQty,
    quotedQty: input.requestedQty,
    promotionTypeLabel: input.promotionTypeLabel,
    priceApplicationLabel: "Precio base",
    calculationTypeLabel: input.calculationTypeLabel ?? "Precio base del producto",
    unitPriceCrc: input.baseUnitPriceCrc,
    totalCrc:
      input.baseUnitPriceCrc != null
        ? input.requestedQty * input.baseUnitPriceCrc
        : null,
    explanation: input.explanation,
  };
}

function simulatePromotionPricing(input: {
  draft: PromotionDraft;
  testQtyRaw: string;
  baseUnitPriceCrc: number | null;
  hasSelectedProduct: boolean;
}): PromotionSimulation {
  const requestedQty = parsePositiveIntOrNull(input.testQtyRaw);
  const promotionTypeLabel =
    input.draft.promoType === "blocks" ? "Promoción por bloques" : "Promoción por rangos";

  if (!input.hasSelectedProduct) {
    return {
      requestedQty,
      quotedQty: null,
      promotionTypeLabel,
      priceApplicationLabel: "Simulación detenida",
      calculationTypeLabel: "Producto requerido",
      unitPriceCrc: null,
      totalCrc: null,
      explanation:
        "Para correr la simulación debes seleccionar un producto real del catálogo. La simulación combina las reglas de la promoción con el producto al que se aplicará.",
    };
  }

  if (!requestedQty) {
    return {
      requestedQty: null,
      quotedQty: null,
      promotionTypeLabel,
      priceApplicationLabel: "Sin cálculo",
      calculationTypeLabel: "Cantidad inválida",
      unitPriceCrc: null,
      totalCrc: null,
      explanation: "Ingresa una cantidad entera mayor a 0 para simular.",
    };
  }

  const minPromoQty = parsePositiveIntOrNull(input.draft.minPromoQty);
  if (!minPromoQty) {
    return createBasePriceSimulation({
      requestedQty,
      baseUnitPriceCrc: input.baseUnitPriceCrc,
      promotionTypeLabel,
      calculationTypeLabel: "Configuración incompleta",
      explanation:
        "Define una cantidad mínima promocional válida para habilitar la simulación completa.",
    });
  }

  if (input.draft.promoType === "ranges") {
    if (requestedQty < minPromoQty) {
      return createBasePriceSimulation({
        requestedQty,
        baseUnitPriceCrc: input.baseUnitPriceCrc,
        promotionTypeLabel,
        explanation: `La cantidad ingresada (${requestedQty}) es menor al mínimo promocional (${minPromoQty}). Aplica precio base del producto.`,
      });
    }

    const activeRanges = input.draft.rangePrices
      .filter(
        (item) =>
          (item.is_active ?? true) &&
          item.range_min_qty > 0 &&
          item.unit_price_crc > 0,
      )
      .sort((left, right) => left.range_min_qty - right.range_min_qty);

    const matchedRange =
      activeRanges.find((item) => {
        const effectiveMax = item.range_max_qty ?? Number.POSITIVE_INFINITY;
        return requestedQty >= item.range_min_qty && requestedQty <= effectiveMax;
      }) ?? null;

    if (!matchedRange) {
      return createBasePriceSimulation({
        requestedQty,
        baseUnitPriceCrc: input.baseUnitPriceCrc,
        promotionTypeLabel,
        calculationTypeLabel: "Precio base (sin rango aplicable)",
        explanation:
          "La cantidad ingresada no cae en un rango activo configurado. Se usa precio base.",
      });
    }

    return {
      requestedQty,
      quotedQty: requestedQty,
      promotionTypeLabel,
      priceApplicationLabel: "Promoción",
      calculationTypeLabel:
        matchedRange.range_max_qty == null
          ? `Rango ${matchedRange.range_min_qty}+`
          : `Rango ${matchedRange.range_min_qty} a ${matchedRange.range_max_qty}`,
      unitPriceCrc: matchedRange.unit_price_crc,
      totalCrc: requestedQty * matchedRange.unit_price_crc,
      explanation:
        matchedRange.range_max_qty == null
          ? `La cantidad ingresada cae en el rango desde ${matchedRange.range_min_qty} unidades, por lo que aplica un precio de ${formatCurrencyCRC(matchedRange.unit_price_crc)} por unidad.`
          : `La cantidad ingresada cae en el rango de ${matchedRange.range_min_qty} a ${matchedRange.range_max_qty} unidades, por lo que aplica un precio de ${formatCurrencyCRC(matchedRange.unit_price_crc)} por unidad.`,
    };
  }

  const blockSize = parsePositiveIntOrNull(input.draft.blockSize);
  const topBlockQty = parsePositiveIntOrNull(input.draft.topBlockQty);
  const postTopBlockPriceCrc = parsePositiveIntOrNull(input.draft.postTopBlockPriceCrc);

  if (!blockSize || !topBlockQty || !postTopBlockPriceCrc) {
    return createBasePriceSimulation({
      requestedQty,
      baseUnitPriceCrc: input.baseUnitPriceCrc,
      promotionTypeLabel,
      calculationTypeLabel: "Configuración de bloques incompleta",
      explanation:
        "Completa tamaño del paquete, tope y precio post-tope para simular esta promoción.",
    });
  }

  const activeBlocks = input.draft.blockPrices
    .filter(
      (item) =>
        (item.is_active ?? true) &&
        item.exact_qty > 0 &&
        item.total_price_crc > 0,
    )
    .sort((left, right) => left.exact_qty - right.exact_qty);

  const firstActiveBlock = activeBlocks[0] ?? null;

  if (firstActiveBlock && requestedQty < firstActiveBlock.exact_qty) {
    return {
      requestedQty,
      quotedQty: firstActiveBlock.exact_qty,
      promotionTypeLabel,
      priceApplicationLabel: "Promoción",
      calculationTypeLabel: "Bloque redondeado hacia arriba",
      unitPriceCrc: firstActiveBlock.total_price_crc / firstActiveBlock.exact_qty,
      totalCrc: firstActiveBlock.total_price_crc,
      explanation:
        requestedQty < minPromoQty
          ? `Esta promoción se vende en paquetes de ${blockSize} unidades. La cantidad ingresada (${requestedQty}) es menor al mínimo promocional (${minPromoQty}), por lo que se cotiza el primer bloque válido de ${firstActiveBlock.exact_qty} unidades.`
          : `Esta promoción se vende en paquetes de ${blockSize} unidades. Para ${requestedQty} unidades, se cotiza el siguiente paquete válido: ${firstActiveBlock.exact_qty} unidades.`,
    };
  }

  const exactBlock = activeBlocks.find((item) => item.exact_qty === requestedQty) ?? null;

  if (exactBlock) {
    return {
      requestedQty,
      quotedQty: exactBlock.exact_qty,
      promotionTypeLabel,
      priceApplicationLabel: "Promoción",
      calculationTypeLabel: "Bloque exacto",
      unitPriceCrc: exactBlock.total_price_crc / exactBlock.exact_qty,
      totalCrc: exactBlock.total_price_crc,
      explanation: `La cantidad ingresada coincide con el bloque exacto de ${exactBlock.exact_qty} unidades configurado para la promoción.`,
    };
  }

  if (requestedQty <= topBlockQty) {
    const roundedBlock =
      activeBlocks.find(
        (item) =>
          item.exact_qty >= requestedQty &&
          item.exact_qty >= minPromoQty &&
          item.exact_qty <= topBlockQty,
      ) ?? null;

    if (!roundedBlock) {
      return createBasePriceSimulation({
        requestedQty,
        baseUnitPriceCrc: input.baseUnitPriceCrc,
        promotionTypeLabel,
        calculationTypeLabel: "Precio base (sin bloque aplicable)",
        explanation:
          "No existe un bloque activo que cubra esta cantidad dentro del rango promocional. Se usa precio base.",
      });
    }

    return {
      requestedQty,
      quotedQty: roundedBlock.exact_qty,
      promotionTypeLabel,
      priceApplicationLabel: "Promoción",
      calculationTypeLabel: "Bloque redondeado hacia arriba",
      unitPriceCrc: roundedBlock.total_price_crc / roundedBlock.exact_qty,
      totalCrc: roundedBlock.total_price_crc,
      explanation: `Esta promoción se vende en paquetes de ${blockSize} unidades. Para ${requestedQty} unidades, se cotiza el siguiente paquete válido: ${roundedBlock.exact_qty} unidades.`,
    };
  }

  const topBlockBase = [...activeBlocks]
    .sort((left, right) => right.exact_qty - left.exact_qty)
    .find((item) => item.exact_qty <= topBlockQty);

  if (!topBlockBase) {
    return createBasePriceSimulation({
      requestedQty,
      baseUnitPriceCrc: input.baseUnitPriceCrc,
      promotionTypeLabel,
      calculationTypeLabel: "Precio base (sin bloque base para post-tope)",
      explanation:
        "No hay un bloque activo configurado para construir el cálculo por encima del tope. Se usa precio base.",
    });
  }

  const additionalPackages = Math.ceil(
    Math.max(0, requestedQty - topBlockBase.exact_qty) / blockSize,
  );
  const quotedQty = topBlockBase.exact_qty + additionalPackages * blockSize;
  const totalCrc = topBlockBase.total_price_crc + additionalPackages * postTopBlockPriceCrc;

  return {
    requestedQty,
    quotedQty,
    promotionTypeLabel,
    priceApplicationLabel: "Promoción",
    calculationTypeLabel: "Post-tope por paquetes adicionales",
    unitPriceCrc: totalCrc / quotedQty,
    totalCrc,
    explanation:
      quotedQty > requestedQty
        ? `La promoción llega hasta ${topBlockQty} unidades con bloques definidos. A partir de ahí, cada paquete adicional de ${blockSize} unidades cuesta ${formatCurrencyCRC(postTopBlockPriceCrc)}. Para ${requestedQty} unidades se redondea a ${quotedQty} unidades.`
        : `La promoción llega hasta ${topBlockQty} unidades con bloques definidos. A partir de ahí, cada paquete adicional de ${blockSize} unidades cuesta ${formatCurrencyCRC(postTopBlockPriceCrc)}.`,
  };
}

function validateAndBuildPayload(draft: PromotionDraft): SavePromotionInput {
  if (!draft.productId.trim()) {
    throw new Error("Debes seleccionar un producto real del catálogo.");
  }

  const name = draft.name.trim();
  if (!name) {
    throw new Error("El nombre comercial de la promoción es obligatorio.");
  }

  const normalizedTimeZone = draft.timezoneName.trim() || DEFAULT_PROMOTION_TIME_ZONE;
  const startsAt = parseDateInputInTimeZone(draft.startsAt, normalizedTimeZone);
  const endsAt = parseDateInputInTimeZone(draft.endsAt, normalizedTimeZone);
  if (!startsAt || !endsAt) {
    throw new Error("Debes indicar fechas válidas para inicio y fin.");
  }

  if (startsAt >= endsAt) {
    throw new Error("La fecha de inicio debe ser menor que la fecha de fin.");
  }

  const minPromoQty = parseIntStrict(
    draft.minPromoQty,
    "Cantidad mínima para aplicar promoción",
  );
  if (minPromoQty <= 0) {
    throw new Error("Cantidad mínima para aplicar promoción debe ser mayor a 0.");
  }

  if (draft.promoType === "blocks") {
    const blockSize = parseIntStrict(draft.blockSize, "Tamaño del paquete");
    const topBlockQty = parseIntStrict(
      draft.topBlockQty,
      "Cantidad máxima con precio especial",
    );
    const postTopBlockPriceCrc = parseIntStrict(
      draft.postTopBlockPriceCrc,
      "Precio por paquete adicional",
    );

    if (blockSize <= 0 || topBlockQty <= 0 || postTopBlockPriceCrc <= 0) {
      throw new Error("Los campos de bloques deben ser mayores a 0.");
    }

    if (draft.blockPrices.length === 0) {
      throw new Error("Debes agregar al menos un bloque exacto.");
    }

    const seen = new Set<number>();
    for (const block of draft.blockPrices) {
      if (block.exact_qty <= 0 || block.total_price_crc <= 0) {
        throw new Error("Cada bloque debe tener cantidad y precio total mayores a 0.");
      }
      if (block.exact_qty % blockSize !== 0) {
        throw new Error("Cada bloque debe ser múltiplo del tamaño del paquete.");
      }
      if (block.exact_qty < minPromoQty) {
        throw new Error("Cada bloque debe ser igual o mayor al mínimo promocional.");
      }
      if (block.exact_qty > topBlockQty) {
        throw new Error("Cada bloque debe ser menor o igual a la cantidad máxima con precio especial.");
      }
      if (seen.has(block.exact_qty)) {
        throw new Error("No puedes repetir cantidades exactas en la misma promoción.");
      }
      seen.add(block.exact_qty);
    }

    return {
      product_id: draft.productId,
      name,
      promo_type: "blocks",
      is_enabled: draft.isEnabled,
      agent_visible: draft.agentVisible,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      timezone_name: normalizedTimeZone,
      min_promo_qty: minPromoQty,
      block_size: blockSize,
      top_block_qty: topBlockQty,
      post_top_block_price_crc: postTopBlockPriceCrc,
      notes: draft.notes.trim() ? draft.notes.trim() : null,
      block_prices: draft.blockPrices.map((item, index) => ({
        ...item,
        sort_order: index,
      })),
      range_prices: [],
    };
  }

  if (draft.rangePrices.length === 0) {
    throw new Error("Debes agregar al menos un rango.");
  }

  let openEndedCount = 0;

  const sortedRanges = [...draft.rangePrices].sort((a, b) => a.range_min_qty - b.range_min_qty);
  sortedRanges.forEach((range) => {
    if (range.range_min_qty <= 0 || range.unit_price_crc <= 0) {
      throw new Error("Cada rango debe tener cantidad desde y precio por unidad mayores a 0.");
    }
    if (range.range_min_qty < minPromoQty) {
      throw new Error("Los rangos deben iniciar desde la cantidad mínima promocional o superior.");
    }
    if (range.range_max_qty != null && range.range_max_qty < range.range_min_qty) {
      throw new Error("Cantidad hasta debe ser mayor o igual que cantidad desde.");
    }
    if (range.range_max_qty == null) {
      openEndedCount += 1;
    }
  });

  if (openEndedCount > 1) {
    throw new Error("Solo se permite un rango abierto superior por promoción.");
  }

  for (let index = 0; index < sortedRanges.length; index += 1) {
    for (let next = index + 1; next < sortedRanges.length; next += 1) {
      const left = sortedRanges[index];
      const right = sortedRanges[next];
      if (!left || !right) {
        continue;
      }
      const leftMax = left.range_max_qty ?? Number.POSITIVE_INFINITY;
      const rightMax = right.range_max_qty ?? Number.POSITIVE_INFINITY;
      if (left.range_min_qty <= rightMax && right.range_min_qty <= leftMax) {
        throw new Error("No se permiten solapamientos entre rangos.");
      }
    }
  }

  return {
    product_id: draft.productId,
    name,
    promo_type: "ranges",
    is_enabled: draft.isEnabled,
    agent_visible: draft.agentVisible,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    timezone_name: normalizedTimeZone,
    min_promo_qty: minPromoQty,
    block_size: null,
    top_block_qty: null,
    post_top_block_price_crc: null,
    notes: draft.notes.trim() ? draft.notes.trim() : null,
    block_prices: [],
    range_prices: draft.rangePrices.map((item, index) => ({
      ...item,
      sort_order: index,
    })),
  };
}

function parseActiveBlocksSummaryLine(line: string): string[] | null {
  const prefix = "Bloques exactos activos:";
  if (!line.startsWith(prefix)) {
    return null;
  }

  const content = line
    .slice(prefix.length)
    .trim()
    .replace(/\.$/, "");

  if (!content) {
    return [];
  }

  return content
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderOperationalSummaryLineWithHighlight(line: string) {
  const pattern = /(precio por paquete adicional de )([₡]\d+(?:[.,]\d+)?)(\.)/i;
  const match = line.match(pattern);

  if (!match || match.index == null) {
    return <span className="leading-6 text-slate-700">{line}</span>;
  }

  const fullMatch = match[0];
  const prefix = line.slice(0, match.index);
  const suffix = line.slice(match.index + fullMatch.length);
  const lead = match[1] ?? "";
  const amount = match[2] ?? "";
  const endDot = match[3] ?? "";

  return (
    <span className="leading-6 text-slate-700">
      {prefix}
      {lead}
      <strong className="font-semibold text-slate-900">{amount}</strong>
      {endDot}
      {suffix}
    </span>
  );
}

function getVisualStatusBadge(status: PromotionVisualStatus) {
  if (status === "active_current") {
    return { label: "Activa vigente", tone: "success" as const };
  }
  if (status === "scheduled") {
    return { label: "Programada", tone: "info" as const };
  }
  if (status === "expired") {
    return { label: "Vencida", tone: "warning" as const };
  }
  if (status === "inactive") {
    return { label: "Inactiva", tone: "neutral" as const };
  }

  return { label: "Error de integridad", tone: "danger" as const };
}

export function PromotionsPageClient() {
  const [search, setSearch] = useState("");
  const [promoTypeFilter, setPromoTypeFilter] = useState<"all" | "blocks" | "ranges">("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active_current" | "scheduled" | "expired" | "inactive" | "integrity_error"
  >("all");
  const [agentVisibleFilter, setAgentVisibleFilter] = useState<"all" | "true" | "false">("all");
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<"create" | "edit" | null>(null);
  const [editingPromotionId, setEditingPromotionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PromotionDraft>(() => defaultDraft());
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formMessageTone, setFormMessageTone] = useState<"info" | "success" | "error">("info");
  const [showConfigHelpPopup, setShowConfigHelpPopup] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [selectedProductDisplayLabel, setSelectedProductDisplayLabel] = useState<string | null>(null);
  const deferredProductQuery = useDeferredValue(productQuery);
  const [simulationQty, setSimulationQty] = useState("1");
  const [simulationInitialQty, setSimulationInitialQty] = useState("1");
  const [detailSimulationQty, setDetailSimulationQty] = useState("1");
  const [focusedCurrencyField, setFocusedCurrencyField] = useState<string | null>(null);

  const promotionQueryParams = useMemo(
    () => ({
      page: 1,
      pageSize: 50,
      search: search.trim() || undefined,
      promoType: promoTypeFilter === "all" ? undefined : promoTypeFilter,
      status: statusFilter,
      agentVisible:
        agentVisibleFilter === "all" ? undefined : agentVisibleFilter === "true",
    }),
    [agentVisibleFilter, promoTypeFilter, search, statusFilter],
  );

  const promotionsQuery = usePromotions(promotionQueryParams);
  const selectedPromotionDetailQuery = usePromotionDetail(selectedPromotionId);
  const { savePromotion, togglePromotion, duplicatePromotion, deletePromotion, isSaving } =
    usePromotionMutations();

  const productOptionsQuery = useProductsCatalog({
    page: 1,
    pageSize: 30,
    search: deferredProductQuery.trim() || undefined,
  });
  const refetchProductOptions = productOptionsQuery.refetch;

  useEffect(() => {
    void refetchProductOptions();
  }, [deferredProductQuery, refetchProductOptions]);

  const productOptions = useMemo(
    () => productOptionsQuery.data?.items ?? [],
    [productOptionsQuery.data?.items],
  );

  const selectedProduct = useMemo(
    () => productOptions.find((product) => product.id === draft.productId) ?? null,
    [draft.productId, productOptions],
  );
  const hasProductSearch = productQuery.trim().length > 0;
  const productSelectPlaceholder = useMemo(() => {
    if (draft.productId && selectedProductDisplayLabel) {
      return selectedProductDisplayLabel;
    }

    if (!hasProductSearch) {
      return "Selecciona un producto real";
    }

    const searchValue = productQuery.trim();
    if (productOptionsQuery.isFetching) {
      return `Buscando "${searchValue}"...`;
    }

    if (productOptions.length > 0) {
      return `${productOptions.length} resultado(s) para "${searchValue}"`;
    }

    return `Sin resultados para "${searchValue}"`;
  }, [
    draft.productId,
    hasProductSearch,
    productOptions.length,
    productOptionsQuery.isFetching,
    productQuery,
    selectedProductDisplayLabel,
  ]);
  const shouldRenderSelectedFallbackOption =
    draft.productId.trim().length > 0 &&
    !!selectedProductDisplayLabel &&
    !productOptions.some((product) => product.id === draft.productId);
  const selectedProductImageUrl = useMemo(
    () =>
      buildStoragePublicUrl(
        selectedProduct?.primary_image_bucket ?? null,
        selectedProduct?.primary_image_path ?? null,
      ),
    [selectedProduct?.primary_image_bucket, selectedProduct?.primary_image_path],
  );

  const selectedPromotion = selectedPromotionDetailQuery.data;
  const promotionStats = useMemo(() => {
    const rows = promotionsQuery.data?.items ?? [];

    return {
      total: rows.length,
      activeCurrent: rows.filter((item) => item.visual_status === "active_current").length,
      scheduled: rows.filter((item) => item.visual_status === "scheduled").length,
      integrityError: rows.filter((item) => item.visual_status === "integrity_error").length,
    };
  }, [promotionsQuery.data?.items]);

  // TODO(pricing): reemplazar esta simulación local por endpoint/backend compartido
  // cuando exista la función oficial de pricing para asegurar una sola fuente de verdad.
  const simulation = useMemo(
    () =>
      simulatePromotionPricing({
        draft,
        testQtyRaw: simulationQty,
        baseUnitPriceCrc: selectedProduct?.price_crc ?? null,
        hasSelectedProduct: draft.productId.trim().length > 0,
      }),
    [draft, selectedProduct?.price_crc, simulationQty],
  );
  const isProductStepComplete = draft.productId.trim().length > 0;
  const startsAtDate = parseDateInputInTimeZone(
    draft.startsAt,
    draft.timezoneName.trim() || DEFAULT_PROMOTION_TIME_ZONE,
  );
  const endsAtDate = parseDateInputInTimeZone(
    draft.endsAt,
    draft.timezoneName.trim() || DEFAULT_PROMOTION_TIME_ZONE,
  );
  const hasValidDateRange =
    startsAtDate != null &&
    endsAtDate != null &&
    startsAtDate < endsAtDate;
  const isConfigStepComplete =
    draft.name.trim().length > 0 &&
    parsePositiveIntOrNull(draft.minPromoQty) != null &&
    draft.timezoneName.trim().length > 0 &&
    hasValidDateRange;
  const isPricingStepComplete =
    draft.promoType === "blocks"
      ? parsePositiveIntOrNull(draft.blockSize) != null &&
        parsePositiveIntOrNull(draft.topBlockQty) != null &&
        parsePositiveIntOrNull(draft.postTopBlockPriceCrc) != null &&
        draft.blockPrices.some((item) => item.exact_qty > 0 && item.total_price_crc > 0)
      : draft.rangePrices.some((item) => item.range_min_qty > 0 && item.unit_price_crc > 0);
  const isSimulationStepComplete = simulationQty.trim() !== simulationInitialQty.trim();
  const isPromotionApplied = simulation.priceApplicationLabel === "Promoción";
  const detailSimulation = useMemo(() => {
    if (!selectedPromotion) {
      return null;
    }

    return simulatePromotionPricing({
      draft: draftFromPromotion(selectedPromotion),
      testQtyRaw: detailSimulationQty,
      baseUnitPriceCrc: selectedPromotion.base_price_crc ?? null,
      hasSelectedProduct: true,
    });
  }, [detailSimulationQty, selectedPromotion]);

  useEffect(() => {
    const firstId = promotionsQuery.data?.items[0]?.id ?? null;

    if (!selectedPromotionId && firstId) {
      setSelectedPromotionId(firstId);
      return;
    }

    if (
      selectedPromotionId &&
      promotionsQuery.data &&
      !promotionsQuery.data.items.some((item) => item.id === selectedPromotionId)
    ) {
      setSelectedPromotionId(firstId);
    }
  }, [promotionsQuery.data, selectedPromotionId]);

  useEffect(() => {
    if (!formMessage) {
      return;
    }

    if (formMessage === "Validando promoción...") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFormMessage(null);
    }, 4500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [formMessage]);

  useEffect(() => {
    if (!selectedPromotion) {
      return;
    }

    setDetailSimulationQty(String(selectedPromotion.min_promo_qty));
  }, [selectedPromotion]);

  function startCreateMode() {
    setEditorMode("create");
    setEditingPromotionId(null);
    setDraft(defaultDraft());
    setSelectedProductDisplayLabel(null);
    setSimulationQty("1");
    setSimulationInitialQty("1");
    setFormMessage(null);
  }

  function startEditMode(detail: PromotionDetail) {
    setEditorMode("edit");
    setEditingPromotionId(detail.id);
    setDraft(draftFromPromotion(detail));
    setSelectedProductDisplayLabel(`${detail.product_name} · ${detail.sku}`);
    const initialQty = String(detail.min_promo_qty);
    setSimulationQty(initialQty);
    setSimulationInitialQty(initialQty);
    setFormMessage(null);
  }

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    const nextLabel = `${selectedProduct.name} · ${selectedProduct.sku}`;
    setSelectedProductDisplayLabel((current) => (current === nextLabel ? current : nextLabel));
  }, [selectedProduct]);

  async function handleSubmit() {
    try {
      setFormMessageTone("info");
      setFormMessage("Validando promoción...");
      const payload = validateAndBuildPayload(draft);
      const result = await savePromotion({
        id: editorMode === "edit" ? editingPromotionId ?? undefined : undefined,
        input: payload,
      });

      setSelectedPromotionId(result.id);
      setFormMessage(null);
      setEditorMode(null);
      setEditingPromotionId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar la promoción.";
      setFormMessageTone("error");
      setFormMessage(message);
    }
  }

  function addBlockRow() {
    setDraft((current) => ({
      ...current,
      blockPrices: [
        ...current.blockPrices,
        {
          exact_qty: 0,
          total_price_crc: 0,
          sort_order: current.blockPrices.length,
          is_active: true,
        },
      ],
    }));
  }

  function suggestBlocks() {
    const blockSize = Number.parseInt(draft.blockSize, 10);
    const topBlockQty = Number.parseInt(draft.topBlockQty, 10);
    const minPromoQty = Number.parseInt(draft.minPromoQty, 10);

    if (!Number.isInteger(blockSize) || !Number.isInteger(topBlockQty) || !Number.isInteger(minPromoQty)) {
      setFormMessageTone("error");
      setFormMessage("Completa tamaño del paquete, cantidad máxima y mínimo antes de sugerir bloques.");
      return;
    }

    if (blockSize <= 0 || topBlockQty <= 0 || minPromoQty <= 0) {
      setFormMessageTone("error");
      setFormMessage("Los valores de bloques y mínimo deben ser mayores a 0.");
      return;
    }

    const firstQty = Math.ceil(minPromoQty / blockSize) * blockSize;
    const values: number[] = [];

    for (let qty = firstQty; qty <= topBlockQty; qty += blockSize) {
      values.push(qty);
    }

    const existingByQty = new Map(draft.blockPrices.map((item) => [item.exact_qty, item]));
    const baseUnitPrice = selectedProduct?.price_crc ?? 1;

    setDraft((current) => ({
      ...current,
      blockPrices: values.map((qty, index) => {
        const existing = existingByQty.get(qty);

        return {
          exact_qty: qty,
          total_price_crc: existing?.total_price_crc ?? qty * baseUnitPrice,
          sort_order: index,
          is_active: existing?.is_active ?? true,
        };
      }),
    }));
  }

  function addRangeRow() {
    setDraft((current) => ({
      ...current,
      rangePrices: [
        ...current.rangePrices,
        {
          range_min_qty: 0,
          range_max_qty: null,
          unit_price_crc: 0,
          sort_order: current.rangePrices.length,
          is_active: true,
        },
      ],
    }));
  }

  function moveBlockRow(index: number, direction: -1 | 1) {
    setDraft((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.blockPrices.length) {
        return current;
      }

      const next = [...current.blockPrices];
      const currentRow = next[index];
      next[index] = next[target] as PromotionBlockPriceInput;
      next[target] = currentRow as PromotionBlockPriceInput;

      return {
        ...current,
        blockPrices: next.map((item, itemIndex) => ({ ...item, sort_order: itemIndex })),
      };
    });
  }

  function moveRangeRow(index: number, direction: -1 | 1) {
    setDraft((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.rangePrices.length) {
        return current;
      }

      const next = [...current.rangePrices];
      const currentRow = next[index];
      next[index] = next[target] as PromotionRangePriceInput;
      next[target] = currentRow as PromotionRangePriceInput;

      return {
        ...current,
        rangePrices: next.map((item, itemIndex) => ({ ...item, sort_order: itemIndex })),
      };
    });
  }

  async function onTogglePromotion(row: PromotionRow) {
    try {
      await togglePromotion({ id: row.id, isEnabled: !row.is_enabled });
    } catch (error) {
      console.error("No se pudo cambiar el estado de la promoción", error);
    }
  }

  async function onDuplicatePromotion(row: PromotionRow) {
    try {
      const created = await duplicatePromotion({ id: row.id });
      setSelectedPromotionId(created.id);
    } catch (error) {
      console.error("No se pudo duplicar la promoción", error);
    }
  }

  async function onEditPromotion(row: PromotionRow) {
    try {
      const detail = await crmApiClient.getPromotion(row.id);
      setSelectedPromotionId(detail.id);
      startEditMode(detail);
    } catch (error) {
      console.error("No se pudo abrir la promoción para edición", error);
    }
  }

  async function onDeletePromotion(row: PromotionRow) {
    try {
      await deletePromotion({ id: row.id });
      if (selectedPromotionId === row.id) {
        setSelectedPromotionId(null);
      }
    } catch (error) {
      console.error("No se pudo eliminar la promoción", error);
    }
  }

  function closeEditorModal() {
    setEditorMode(null);
    setEditingPromotionId(null);
    setDraft(defaultDraft());
    setSimulationQty("1");
    setSimulationInitialQty("1");
  }

  return (
    <div className="space-y-8">
      <div className="space-y-6 rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <PageHeader
            title="Promociones"
            description="Gestión comercial de promociones por producto integrada al catálogo actual."
          />
          <div className="flex flex-col gap-2 md:flex-row">
            <Button asChild variant="outline" className="gap-2">
              <Link href="/products">
                <ArrowLeft className="h-4 w-4" />
                Volver a Productos
              </Link>
            </Button>
            <Button type="button" className="gap-2" onClick={startCreateMode}>
              Nueva Promoción
            </Button>
          </div>
        </div>

        <div className="grid gap-3 border-t border-border/70 pt-5 lg:grid-cols-4">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por producto, sku o nombre de promoción"
              className="h-10 w-full rounded-xl border border-border bg-white pl-10 pr-4 text-sm text-slate-950 outline-none transition focus:border-primary"
            />
          </label>

          <select
            value={promoTypeFilter}
            onChange={(event) => setPromoTypeFilter(event.target.value as typeof promoTypeFilter)}
            className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
          >
            <option value="all">Tipo: todos</option>
            <option value="blocks">Por bloques</option>
            <option value="ranges">Por rangos</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
          >
            <option value="all">Estado: todos</option>
            <option value="active_current">Activa vigente</option>
            <option value="scheduled">Programada</option>
            <option value="expired">Vencida</option>
            <option value="inactive">Inactiva</option>
            <option value="integrity_error">Error de integridad</option>
          </select>

          <select
            value={agentVisibleFilter}
            onChange={(event) => setAgentVisibleFilter(event.target.value as typeof agentVisibleFilter)}
            className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
          >
            <option value="all">Visible al agente: todos</option>
            <option value="true">Solo visibles</option>
            <option value="false">Solo ocultas</option>
          </select>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[24px] border border-white/70 bg-white/90 p-5 text-center shadow-[0_30px_56px_-26px_rgba(2,6,23,0.24),0_12px_26px_-14px_rgba(2,6,23,0.17)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Promociones visibles
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{promotionStats.total}</p>
        </article>
        <article className="rounded-[24px] border border-emerald-200/80 bg-emerald-50/80 p-5 text-center shadow-[0_30px_56px_-26px_rgba(2,6,23,0.24),0_12px_26px_-14px_rgba(2,6,23,0.17)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">
            Activas vigentes
          </p>
          <p className="mt-2 text-3xl font-semibold text-emerald-900">{promotionStats.activeCurrent}</p>
        </article>
        <article className="rounded-[24px] border border-sky-200/80 bg-sky-50/80 p-5 text-center shadow-[0_30px_56px_-26px_rgba(2,6,23,0.24),0_12px_26px_-14px_rgba(2,6,23,0.17)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-800">
            Programadas
          </p>
          <p className="mt-2 text-3xl font-semibold text-sky-900">{promotionStats.scheduled}</p>
        </article>
        <article className="rounded-[24px] border border-rose-200/80 bg-rose-50/80 p-5 text-center shadow-[0_30px_56px_-26px_rgba(2,6,23,0.24),0_12px_26px_-14px_rgba(2,6,23,0.17)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
            Con errores de integridad
          </p>
          <p className="mt-2 text-3xl font-semibold text-rose-800">{promotionStats.integrityError}</p>
        </article>
      </section>

      <section className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border/70 text-center">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-3 py-3">Producto</th>
                <th className="px-3 py-3">SKU</th>
                <th className="px-3 py-3">Promoción</th>
                <th className="px-3 py-3">Tipo</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3">Visible</th>
                <th className="px-3 py-3">Inicio</th>
                <th className="px-3 py-3">Fin</th>
                <th className="px-3 py-3">Vigente</th>
                <th className="px-3 py-3">Actualizada</th>
                <th className="px-3 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {promotionsQuery.isLoading ? (
                <TableEmptyStateRow
                  colSpan={11}
                  title="Cargando promociones"
                  description="Consultando configuración comercial..."
                  isLoading
                />
              ) : null}

              {!promotionsQuery.isLoading && promotionsQuery.data?.items.length === 0 ? (
                <TableEmptyStateRow
                  colSpan={11}
                  title="No hay promociones para este filtro"
                  description="Ajusta búsqueda o crea una nueva promoción."
                />
              ) : null}

              {(promotionsQuery.data?.items ?? []).map((row) => {
                const status = getVisualStatusBadge(row.visual_status);

                return (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedPromotionId(row.id)}
                    className={`cursor-pointer border-b border-border/70 text-sm text-slate-700 transition hover:bg-slate-50/70 ${
                      selectedPromotionId === row.id ? "bg-sky-50/60" : ""
                    }`}
                  >
                    <td className="px-3 py-3 font-medium text-slate-950">{row.product_name}</td>
                    <td className="px-3 py-3">{row.sku}</td>
                    <td className="px-3 py-3">{row.name}</td>
                    <td className="px-3 py-3">{row.promo_type === "blocks" ? "Por bloques" : "Por rangos"}</td>
                    <td className="px-3 py-3">
                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                    </td>
                    <td className="px-3 py-3">{row.agent_visible ? "Sí" : "No"}</td>
                    <td className="px-3 py-3">{formatDateTime(row.starts_at)}</td>
                    <td className="px-3 py-3">{formatDateTime(row.ends_at)}</td>
                    <td className="px-3 py-3">{row.vigente ? "Sí" : "No"}</td>
                    <td className="px-3 py-3">{formatDateTime(row.updated_at)}</td>
                    <td className="px-3 py-3">
                      <div
                        className="flex flex-nowrap items-center justify-center gap-1"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={`h-9 w-9 rounded-full ${
                            row.is_enabled
                              ? "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                              : "text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          }`}
                          onClick={() => onTogglePromotion(row)}
                          aria-label={row.is_enabled ? "Desactivar promoción" : "Activar promoción"}
                          title={row.is_enabled ? "Desactivar promoción" : "Activar promoción"}
                        >
                          {row.is_enabled ? (
                            <ToggleRight className="h-6 w-6" />
                          ) : (
                            <ToggleLeft className="h-6 w-6" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                          onClick={() => onEditPromotion(row)}
                          aria-label="Editar promoción"
                          title="Editar promoción"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                          onClick={() => onDuplicatePromotion(row)}
                          aria-label="Duplicar promoción"
                          title="Duplicar promoción"
                        >
                          <Copy className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-full text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => onDeletePromotion(row)}
                          aria-label="Eliminar promoción"
                          title="Eliminar promoción"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4 rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)]">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-2xl font-semibold text-slate-900">Detalle de promoción</h3>
        </div>

        {!selectedPromotionId ? (
          <StateDisplay
            compact
            title="Selecciona una promoción"
            description="El detalle operativo aparecerá en este panel."
          />
        ) : null}

        {selectedPromotionDetailQuery.isLoading ? (
          <StateDisplay
            compact
            title="Cargando detalle"
            description="Consultando bloques y rangos de la promoción seleccionada."
          />
        ) : null}

        {selectedPromotion ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
            <div className="flex h-full flex-col gap-4 text-sm text-slate-700">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-border/80 bg-gradient-to-b from-white to-slate-50/80 p-4 shadow-[0_16px_30px_-20px_rgba(2,6,23,0.22)]">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Producto</p>
                    <CircleDot className="h-3.5 w-3.5 text-slate-300" />
                  </div>
                  <p className="mt-2 text-xl font-semibold leading-7 text-slate-950">{selectedPromotion.product_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">SKU: {selectedPromotion.sku}</p>
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Precio base</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {selectedPromotion.base_price_crc != null ? formatCurrencyCRC(selectedPromotion.base_price_crc) : "No definido"}
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/80 bg-gradient-to-b from-white to-slate-50/80 p-4 shadow-[0_16px_30px_-20px_rgba(2,6,23,0.22)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Promoción</p>
                  <p className="mt-2 text-xl font-semibold leading-7 text-slate-950">{selectedPromotion.name}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge tone={selectedPromotion.agent_visible ? "info" : "warning"}>
                      {selectedPromotion.agent_visible ? "Visible al agente" : "No visible al agente"}
                    </StatusBadge>
                    <StatusBadge tone={selectedPromotion.vigente ? "success" : "neutral"}>
                      {selectedPromotion.vigente ? "Vigente" : "No vigente"}
                    </StatusBadge>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    Tipo:{" "}
                    <span className="font-medium text-slate-900">
                      {selectedPromotion.promo_type === "blocks" ? "Por bloques" : "Por rangos"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex-1 rounded-2xl border border-border/80 bg-white p-4 shadow-[0_16px_30px_-20px_rgba(2,6,23,0.2)]">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Resumen operativo</p>
                <ul className="mt-3 space-y-2.5 text-sm text-slate-700">
                  {selectedPromotion.operational_summary.map((line, index) => {
                    const activeBlocks = parseActiveBlocksSummaryLine(line);

                    return (
                      <li
                        key={line}
                        className="rounded-xl border border-slate-200/90 bg-slate-50/70 px-3 py-2 shadow-[inset_3px_0_0_rgba(59,130,246,0.35)]"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-slate-900 text-[11px] font-semibold text-white">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            {activeBlocks ? (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                                  Bloques exactos activos
                                </p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {activeBlocks.map((block) => (
                                    <span
                                      key={block}
                                      className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-900"
                                    >
                                      {block}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              renderOperationalSummaryLineWithHighlight(line)
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {selectedPromotion.integrity_issues.length > 0 ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-700">
                  <p className="text-xs uppercase tracking-[0.12em]">Errores de integridad</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {selectedPromotion.integrity_issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <aside className="rounded-2xl border border-border/80 bg-white p-4 shadow-[0_20px_36px_-22px_rgba(2,6,23,0.26)]">
              <p className="text-xl font-semibold leading-7 text-slate-950">Simulador de precios</p>
              <p className="mt-1 text-sm text-slate-600">
                Prueba cantidades y visualiza resultado comercial en tiempo real.
              </p>

              <div className="mt-3 rounded-xl border border-border bg-slate-50 px-3 py-3">
                <p className="text-xs text-muted-foreground">Cantidad a probar</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    onClick={() =>
                      setDetailSimulationQty((current) => {
                        const value = parsePositiveIntOrNull(current) ?? 1;
                        return String(Math.max(1, value - 1));
                      })
                    }
                    aria-label="Disminuir cantidad a probar"
                    title="Disminuir cantidad"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <input
                    value={detailSimulationQty}
                    onChange={(event) => setDetailSimulationQty(event.target.value)}
                    inputMode="numeric"
                    className="h-10 w-full rounded-lg border border-border bg-white px-2 text-center text-base font-medium text-slate-950 outline-none transition focus:border-primary"
                  />
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    onClick={() =>
                      setDetailSimulationQty((current) => {
                        const value = parsePositiveIntOrNull(current) ?? 0;
                        return String(value + 1);
                      })
                    }
                    aria-label="Aumentar cantidad a probar"
                    title="Aumentar cantidad"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {detailSimulation ? (
                <div className="mt-3 space-y-3 text-sm text-slate-700">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-white px-3 py-2 shadow-sm">
                      <p className="text-xs text-muted-foreground">Precio unitario</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">
                        {detailSimulation.unitPriceCrc != null
                          ? formatCurrencyCRC(detailSimulation.unitPriceCrc)
                          : "No definido"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 shadow-sm">
                      <p className="text-xs text-primary/70">Total</p>
                      <p className="mt-1 text-2xl font-semibold text-primary">
                        {detailSimulation.totalCrc != null
                          ? formatCurrencyCRC(detailSimulation.totalCrc)
                          : "No definido"}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-slate-50 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Aplicación</p>
                    <p className="font-medium text-slate-900">{detailSimulation.priceApplicationLabel}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-slate-50 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Tipo de cálculo</p>
                    <p className="font-medium text-slate-900">{detailSimulation.calculationTypeLabel}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-white px-3 py-3">
                    <p className="text-xs text-muted-foreground">Explicación</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{detailSimulation.explanation}</p>
                  </div>
                </div>
              ) : null}
            </aside>
          </div>
        ) : null}
      </section>

      {editorMode ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/45 p-4 md:p-6"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeEditorModal();
            }
          }}
        >
          <section className="relative max-h-[94vh] w-full max-w-[1380px] overflow-y-auto rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.35),0_16px_34px_-16px_rgba(2,6,23,0.24)] md:p-6">
            {formMessage ? (
              <div
                className={`absolute right-6 top-20 z-20 max-w-md rounded-xl border px-4 py-3 text-sm shadow-lg ${
                  formMessageTone === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : formMessageTone === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-sky-200 bg-sky-50 text-sky-800"
                }`}
                role="alert"
                aria-live="polite"
              >
                <div className="flex items-start justify-between gap-3">
                  <p>{formMessage}</p>
                  <button
                    type="button"
                    className="text-xs font-semibold uppercase tracking-[0.1em] opacity-70 transition hover:opacity-100"
                    onClick={() => setFormMessage(null)}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : null}
            <div className="mb-5 flex flex-col gap-4 border-b border-border/70 pb-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="font-serif text-2xl font-semibold text-slate-900">Crear promoción</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Configura producto, reglas de precio y simulación sin salir del flujo comercial actual.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={closeEditorModal}>
                  {editorMode === "edit" ? "Cerrar" : "Cancelar"}
                </Button>
                <Button type="button" onClick={handleSubmit} disabled={isSaving}>
                  {isSaving
                    ? "Guardando..."
                    : editorMode === "edit"
                      ? "Guardar promoción"
                      : "Crear promoción"}
                </Button>
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-border/80 bg-slate-50 p-3 lg:hidden">
              <ol className="grid grid-cols-2 gap-2 text-xs text-slate-700 sm:grid-cols-4">
                <li
                  className={`rounded-lg border px-2 py-2 font-medium ${
                    isProductStepComplete
                      ? "border-sky-200 bg-sky-50 text-sky-800"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  1. Producto
                </li>
                <li
                  className={`rounded-lg border px-2 py-2 font-medium ${
                    isConfigStepComplete
                      ? "border-sky-200 bg-sky-50 text-sky-800"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  2. Configuración
                </li>
                <li
                  className={`rounded-lg border px-2 py-2 font-medium ${
                    isPricingStepComplete
                      ? "border-sky-200 bg-sky-50 text-sky-800"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  3. Reglas de precio
                </li>
                <li
                  className={`rounded-lg border px-2 py-2 font-medium ${
                    isSimulationStepComplete
                      ? "border-sky-200 bg-sky-50 text-sky-800"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  4. Simulación
                </li>
              </ol>
            </div>

            <div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)_340px]">
              <aside className="hidden lg:block">
                <div className="sticky top-3 space-y-4">
                  <div className="rounded-2xl border border-border/80 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Flujo de creación
                    </p>
                    <ol className="mt-4 space-y-0">
                      <li className="flex gap-3">
                        <div className="flex w-7 flex-col items-center">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full border text-sm font-semibold ${
                              isProductStepComplete
                                ? "border-sky-500 bg-sky-500 text-white"
                                : "border-slate-300 bg-white text-slate-700"
                            }`}
                          >
                            1
                          </div>
                          <div className="mt-1 h-[54px] w-px border-l border-dashed border-slate-300" />
                        </div>
                        <div className="pb-4 pt-0.5">
                          <p className={`text-base font-semibold ${isProductStepComplete ? "text-sky-700" : "text-slate-900"}`}>
                            Producto
                          </p>
                          <p className="mt-1 text-sm leading-5 text-slate-600">
                            Selecciona el producto al que aplicará la promoción.
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <div className="flex w-7 flex-col items-center">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full border text-sm font-semibold ${
                              isConfigStepComplete
                                ? "border-sky-500 bg-sky-500 text-white"
                                : "border-slate-300 bg-white text-slate-700"
                            }`}
                          >
                            2
                          </div>
                          <div className="mt-1 h-[54px] w-px border-l border-dashed border-slate-300" />
                        </div>
                        <div className="pb-4 pt-0.5">
                          <p className={`text-base font-semibold ${isConfigStepComplete ? "text-sky-700" : "text-slate-900"}`}>
                            Configuración
                          </p>
                          <p className="mt-1 text-sm leading-5 text-slate-600">
                            Define la información general de la promoción.
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <div className="flex w-7 flex-col items-center">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full border text-sm font-semibold ${
                              isPricingStepComplete
                                ? "border-sky-500 bg-sky-500 text-white"
                                : "border-slate-300 bg-white text-slate-700"
                            }`}
                          >
                            3
                          </div>
                          <div className="mt-1 h-[54px] w-px border-l border-dashed border-slate-300" />
                        </div>
                        <div className="pb-4 pt-0.5">
                          <p className={`text-base font-semibold ${isPricingStepComplete ? "text-sky-700" : "text-slate-900"}`}>
                            Precios y reglas
                          </p>
                          <p className="mt-1 text-sm leading-5 text-slate-600">
                            Establece rangos o bloques y sus precios.
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <div className="flex w-7 flex-col items-start">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full border text-sm font-semibold ${
                              isSimulationStepComplete
                                ? "border-sky-500 bg-sky-500 text-white"
                                : "border-slate-300 bg-white text-slate-700"
                            }`}
                          >
                            4
                          </div>
                        </div>
                        <div className="pt-0.5">
                          <p className={`text-base font-semibold ${isSimulationStepComplete ? "text-sky-700" : "text-slate-900"}`}>
                            Simulación
                          </p>
                          <p className="mt-1 text-sm leading-5 text-slate-600">
                            Verifica cómo se aplicará la promoción.
                          </p>
                        </div>
                      </li>
                    </ol>
                  </div>
                  <div className="rounded-2xl border border-border/80 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">¿Necesitas ayuda?</p>
                    <p className="mt-1 text-sm leading-5 text-slate-600">
                      Consulta la guía rápida para configurar promociones.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowConfigHelpPopup(true)}
                      className="mt-3 text-sm font-semibold text-sky-700 transition hover:text-sky-800"
                    >
                      Ver guía
                    </button>
                  </div>
                </div>
              </aside>

              <div className="space-y-5 text-sm">
                <section id="step-product" className="space-y-4 rounded-2xl border border-border/80 bg-white px-5 py-5 lg:px-6 lg:py-6">
                  <div className="space-y-1.5">
                    <p className="text-lg font-semibold text-slate-900">1. Producto</p>
                    <p className="text-sm text-muted-foreground">Selecciona el producto real al que se aplicará la promoción.</p>
                  </div>

                  <label className="space-y-1.5">
                    <span className="text-xs leading-5 text-muted-foreground">Buscar producto por nombre, sku, family o category</span>
                    <input
                      value={productQuery}
                      onChange={(event) => setProductQuery(event.target.value)}
                      className="h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-slate-950 outline-none transition focus:border-primary"
                      placeholder="Ejemplo: taza, sku, category..."
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs leading-5 text-muted-foreground">Producto del catálogo</span>
                    <select
                      value={draft.productId}
                      onChange={(event) => {
                        const nextProductId = event.target.value;
                        setDraft((current) => ({ ...current, productId: nextProductId }));

                        if (!nextProductId) {
                          setSelectedProductDisplayLabel(null);
                          return;
                        }

                        const selectedOption = productOptions.find(
                          (product) => product.id === nextProductId,
                        );
                        if (selectedOption) {
                          setSelectedProductDisplayLabel(
                            `${selectedOption.name} · ${selectedOption.sku}`,
                          );
                        }
                      }}
                      className="h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-slate-950 outline-none transition focus:border-primary"
                    >
                      <option value="">{productSelectPlaceholder}</option>
                      {shouldRenderSelectedFallbackOption ? (
                        <option value={draft.productId}>{selectedProductDisplayLabel}</option>
                      ) : null}
                      {productOptions.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} · {product.sku}
                        </option>
                      ))}
                    </select>
                    {productOptionsQuery.isFetching ? (
                      <p className="text-xs text-muted-foreground">Buscando productos...</p>
                    ) : null}
                    {productOptionsQuery.isError ? (
                      <p className="text-xs font-medium text-rose-700">
                        {productOptionsQuery.error?.message ?? "No se pudieron cargar productos."}
                      </p>
                    ) : null}
                    {!productOptionsQuery.isFetching &&
                    !productOptionsQuery.isError &&
                    productOptions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No encontramos productos para esa búsqueda.
                      </p>
                    ) : null}
                  </label>

                  {selectedProduct ? (
                    <div className="rounded-xl border border-border bg-slate-50/80 p-4 lg:p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
                        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-white">
                          {selectedProductImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={selectedProductImageUrl}
                              alt={selectedProduct.primary_image_alt ?? selectedProduct.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                              Sin foto
                            </div>
                          )}
                        </div>
                        <div className="grid flex-1 gap-x-5 gap-y-2 text-xs leading-5 text-slate-700 md:grid-cols-2">
                          <p className="md:col-span-2 text-base font-semibold text-slate-900">{selectedProduct.name}</p>
                          <p>SKU: {selectedProduct.sku}</p>
                          <p>Categoría: {selectedProduct.category}</p>
                          <p>Family: {selectedProduct.family}</p>
                          <p>
                            Precio base:{" "}
                            {selectedProduct.price_crc != null ? formatCurrencyCRC(selectedProduct.price_crc) : "No definido"}
                          </p>
                          <p>Estado: {selectedProduct.is_active ? "Activo" : "Inactivo"}</p>
                          <p className="md:col-span-2">
                            Visible agente: {selectedProduct.is_agent_visible ? "Sí" : "No"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </section>

                <section id="step-configuration" className="space-y-4 rounded-2xl border border-border/80 bg-white px-5 py-5 lg:px-6 lg:py-6">
                  <div className="space-y-1.5">
                    <p className="text-lg font-semibold text-slate-900">2. Configuración de la promoción</p>
                    <p className="text-sm text-muted-foreground">Define los metadatos y vigencia comercial de la promoción.</p>
                  </div>
                  <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
                    <label className="space-y-1.5 md:col-span-2">
                      <span className="text-xs leading-5 text-muted-foreground">Nombre comercial de la promoción</span>
                      <input
                        value={draft.name}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, name: event.target.value }))
                        }
                        className="h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-slate-950 outline-none transition focus:border-primary"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs leading-5 text-muted-foreground">Tipo de promoción</span>
                      <select
                        value={draft.promoType}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            promoType: event.target.value as "blocks" | "ranges",
                          }))
                        }
                        className="h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-slate-950 outline-none transition focus:border-primary"
                      >
                        <option value="blocks">Por bloques</option>
                        <option value="ranges">Por rangos</option>
                      </select>
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs leading-5 text-muted-foreground">Cantidad mínima para aplicar promoción</span>
                      <input
                        type="number"
                        min={1}
                        value={draft.minPromoQty}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, minPromoQty: event.target.value }))
                        }
                        className="h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-slate-950 outline-none transition focus:border-primary"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs leading-5 text-muted-foreground">Inicio</span>
                      <input
                        type="datetime-local"
                        value={draft.startsAt}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, startsAt: event.target.value }))
                        }
                        className="h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-slate-950 outline-none transition focus:border-primary"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs leading-5 text-muted-foreground">Fin</span>
                      <input
                        type="datetime-local"
                        value={draft.endsAt}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, endsAt: event.target.value }))
                        }
                        className="h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-slate-950 outline-none transition focus:border-primary"
                      />
                    </label>

                    <label className="space-y-1.5 md:col-span-2">
                      <span className="text-xs leading-5 text-muted-foreground">Zona horaria</span>
                      <input
                        value={draft.timezoneName}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, timezoneName: event.target.value }))
                        }
                        className="h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-slate-950 outline-none transition focus:border-primary"
                      />
                    </label>

                    <label className="space-y-1.5 md:col-span-2">
                      <span className="text-xs leading-5 text-muted-foreground">Notas internas (opcional)</span>
                      <textarea
                        value={draft.notes}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, notes: event.target.value }))
                        }
                        rows={4}
                        className="w-full rounded-xl border border-border bg-white px-3.5 py-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                      />
                    </label>
                  </div>

                  <div className="mt-1 flex flex-wrap gap-5 border-t border-border/70 pt-4">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.isEnabled}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, isEnabled: event.target.checked }))
                        }
                      />
                      Activación manual
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.agentVisible}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, agentVisible: event.target.checked }))
                        }
                      />
                      Visible al agente
                    </label>
                  </div>
                </section>

                <section id="step-rules" className="space-y-4 rounded-2xl border border-border/80 bg-white px-5 py-5 lg:px-6 lg:py-6">
                  {draft.promoType === "blocks" ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1.5">
                          <p className="text-lg font-semibold text-slate-900">3. Precios por bloques</p>
                          <p className="text-sm text-muted-foreground">
                            Define la lógica de paquetes y los precios por bloque según la configuración actual.
                          </p>
                        </div>
                        <button
                          type="button"
                          className="group relative inline-flex h-6 w-6 items-center justify-center rounded-full border border-sky-700 bg-sky-600 text-xs font-bold text-white"
                          aria-label="Ayuda sobre configuración por bloques"
                          onClick={() => setShowConfigHelpPopup(true)}
                        >
                          ?
                          <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 shadow-lg group-hover:block">
                            Ayuda acerca configuración por bloques
                          </span>
                        </button>
                      </div>

                      <div className="grid gap-x-4 gap-y-3 md:grid-cols-3">
                        <label className="space-y-1.5">
                          <span className="text-xs leading-5 text-muted-foreground">Tamaño del paquete</span>
                          <input
                            type="number"
                            min={1}
                            value={draft.blockSize}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, blockSize: event.target.value }))
                            }
                            className="h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-slate-950 outline-none transition focus:border-primary"
                          />
                        </label>
                        <label className="space-y-1.5">
                          <span className="text-xs leading-5 text-muted-foreground">Cantidad máxima con precio especial</span>
                          <input
                            type="number"
                            min={1}
                            value={draft.topBlockQty}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, topBlockQty: event.target.value }))
                            }
                            className="h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-slate-950 outline-none transition focus:border-primary"
                          />
                        </label>
                        <label className="space-y-1.5">
                          <span className="text-xs leading-5 text-muted-foreground">Precio por paquete adicional</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={
                              focusedCurrencyField === "post-top-block-price"
                                ? draft.postTopBlockPriceCrc
                                : (() => {
                                    const parsed = parseCurrencyVisualInput(draft.postTopBlockPriceCrc);
                                    return parsed != null ? formatCurrencyVisual(parsed) : draft.postTopBlockPriceCrc;
                                  })()
                            }
                            onFocus={() => setFocusedCurrencyField("post-top-block-price")}
                            onBlur={() => setFocusedCurrencyField((current) =>
                              current === "post-top-block-price" ? null : current,
                            )}
                            onChange={(event) =>
                              setDraft((current) => {
                                const parsed = parseCurrencyVisualInput(event.target.value);
                                return {
                                  ...current,
                                  postTopBlockPriceCrc: parsed != null ? String(parsed) : "",
                                };
                              })
                            }
                            className="h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-slate-950 outline-none transition focus:border-primary"
                          />
                        </label>
                      </div>

                      <div className="flex flex-wrap gap-2.5 pt-1">
                        <Button type="button" variant="outline" onClick={addBlockRow}>
                          Agregar bloque
                        </Button>
                        <Button type="button" variant="outline" onClick={suggestBlocks}>
                          Autocompletar bloques sugeridos
                        </Button>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-border/80">
                        <table className="min-w-full text-sm">
                          <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-muted-foreground">
                            <tr>
                              <th className="px-3.5 py-3 text-center font-medium">Cantidad exacta</th>
                              <th className="px-3.5 py-3 text-center font-medium">Precio total del bloque</th>
                              <th className="px-3.5 py-3 text-center font-medium">Estado</th>
                              <th className="px-3.5 py-3 text-center font-medium">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {draft.blockPrices.map((row, index) => (
                              <tr key={`${row.exact_qty}-${index}`} className="border-t border-border/70 align-top">
                                <td className="px-3.5 py-3">
                                  <input
                                    type="number"
                                    min={1}
                                    value={row.exact_qty}
                                    onChange={(event) => {
                                      const value = Number.parseInt(event.target.value || "0", 10);
                                      setDraft((current) => ({
                                        ...current,
                                        blockPrices: current.blockPrices.map((item, innerIndex) =>
                                          innerIndex === index
                                            ? { ...item, exact_qty: Number.isInteger(value) ? value : 0 }
                                            : item,
                                        ),
                                      }));
                                    }}
                                    className="h-11 w-full min-w-28 rounded-xl border border-border bg-white px-3.5 text-sm"
                                  />
                                </td>
                                <td className="px-3.5 py-3">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={
                                      focusedCurrencyField === `block-total-${index}`
                                        ? String(row.total_price_crc)
                                        : formatCurrencyVisual(row.total_price_crc)
                                    }
                                    onFocus={() => setFocusedCurrencyField(`block-total-${index}`)}
                                    onBlur={() =>
                                      setFocusedCurrencyField((current) =>
                                        current === `block-total-${index}` ? null : current,
                                      )
                                    }
                                    onChange={(event) => {
                                      const value = parseCurrencyVisualInput(event.target.value);
                                      setDraft((current) => ({
                                        ...current,
                                        blockPrices: current.blockPrices.map((item, innerIndex) =>
                                          innerIndex === index
                                            ? { ...item, total_price_crc: value ?? 0 }
                                            : item,
                                        ),
                                      }));
                                    }}
                                    className="h-11 w-full min-w-36 rounded-xl border border-border bg-white px-3.5 text-sm"
                                  />
                                </td>
                                <td className="px-3.5 py-3">
                                  <label className="inline-flex h-11 items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={row.is_active ?? true}
                                      onChange={(event) => {
                                        setDraft((current) => ({
                                          ...current,
                                          blockPrices: current.blockPrices.map((item, innerIndex) =>
                                            innerIndex === index
                                              ? { ...item, is_active: event.target.checked }
                                              : item,
                                          ),
                                        }));
                                      }}
                                    />
                                    Activo
                                  </label>
                                </td>
                                <td className="px-3.5 py-3">
                                  <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" size="icon" className="h-7 w-7 rounded-md" onClick={() => moveBlockRow(index, -1)}>
                                      <ArrowUp className="h-3 w-3" />
                                    </Button>
                                    <Button type="button" variant="outline" size="icon" className="h-7 w-7 rounded-md" onClick={() => moveBlockRow(index, 1)}>
                                      <ArrowDown className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7 rounded-md"
                                      onClick={() => {
                                        setDraft((current) => ({
                                          ...current,
                                          blockPrices: current.blockPrices.filter((_, innerIndex) => innerIndex !== index),
                                        }));
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="pt-1 text-xs text-muted-foreground">
                        Cada bloque representa una cantidad exacta cotizable dentro de la promoción por bloques.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1.5">
                          <p className="text-lg font-semibold text-slate-900">3. Precios por rangos</p>
                          <p className="text-sm text-muted-foreground">
                            Define los rangos de cantidad y el precio unitario aplicable en cada uno.
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Button type="button" variant="outline" onClick={addRangeRow}>
                            Agregar rango
                          </Button>
                          <button
                            type="button"
                            className="group relative inline-flex h-6 w-6 items-center justify-center rounded-full border border-sky-700 bg-sky-600 text-xs font-bold text-white"
                            aria-label="Ayuda sobre configuración por rangos"
                            onClick={() => setShowConfigHelpPopup(true)}
                          >
                            ?
                            <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 shadow-lg group-hover:block">
                              Ayuda acerca configuración por rangos
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-border/80">
                        <table className="min-w-full text-sm">
                          <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-muted-foreground">
                            <tr>
                              <th className="px-3.5 py-3 text-center font-medium">Desde (unidades)</th>
                              <th className="px-3.5 py-3 text-center font-medium">Hasta (unidades)</th>
                              <th className="px-3.5 py-3 text-center font-medium">Precio unitario</th>
                              <th className="px-3.5 py-3 text-center font-medium">Estado</th>
                              <th className="px-3.5 py-3 text-center font-medium">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {draft.rangePrices.map((row, index) => (
                              <tr key={`${row.range_min_qty}-${index}`} className="border-t border-border/70 align-top">
                                <td className="px-3.5 py-3">
                                  <input
                                    type="number"
                                    min={1}
                                    value={row.range_min_qty}
                                    onChange={(event) => {
                                      const value = Number.parseInt(event.target.value || "0", 10);
                                      setDraft((current) => ({
                                        ...current,
                                        rangePrices: current.rangePrices.map((item, innerIndex) =>
                                          innerIndex === index
                                            ? { ...item, range_min_qty: Number.isInteger(value) ? value : 0 }
                                            : item,
                                        ),
                                      }));
                                    }}
                                    className="h-11 w-full min-w-28 rounded-xl border border-border bg-white px-3.5 text-sm"
                                  />
                                </td>
                                <td className="px-3.5 py-3">
                                  <input
                                    type="number"
                                    min={1}
                                    value={row.range_max_qty ?? ""}
                                    onChange={(event) => {
                                      const value = event.target.value.trim();
                                      const parsed = Number.parseInt(value || "0", 10);

                                      setDraft((current) => ({
                                        ...current,
                                        rangePrices: current.rangePrices.map((item, innerIndex) =>
                                          innerIndex === index
                                            ? {
                                                ...item,
                                                range_max_qty:
                                                  value === "" ? null : Number.isInteger(parsed) ? parsed : null,
                                              }
                                            : item,
                                        ),
                                      }));
                                    }}
                                    className="h-11 w-full min-w-28 rounded-xl border border-border bg-white px-3.5 text-sm"
                                    placeholder={row.range_max_qty == null ? "∞ (abierto)" : undefined}
                                  />
                                </td>
                                <td className="px-3.5 py-3">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={
                                      focusedCurrencyField === `range-unit-${index}`
                                        ? String(row.unit_price_crc)
                                        : formatCurrencyVisual(row.unit_price_crc)
                                    }
                                    onFocus={() => setFocusedCurrencyField(`range-unit-${index}`)}
                                    onBlur={() =>
                                      setFocusedCurrencyField((current) =>
                                        current === `range-unit-${index}` ? null : current,
                                      )
                                    }
                                    onChange={(event) => {
                                      const value = parseCurrencyVisualInput(event.target.value);
                                      setDraft((current) => ({
                                        ...current,
                                        rangePrices: current.rangePrices.map((item, innerIndex) =>
                                          innerIndex === index
                                            ? { ...item, unit_price_crc: value ?? 0 }
                                            : item,
                                        ),
                                      }));
                                    }}
                                    className="h-11 w-full min-w-36 rounded-xl border border-border bg-white px-3.5 text-sm"
                                  />
                                </td>
                                <td className="px-3.5 py-3">
                                  <label className="inline-flex h-11 items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={row.is_active ?? true}
                                      onChange={(event) => {
                                        setDraft((current) => ({
                                          ...current,
                                          rangePrices: current.rangePrices.map((item, innerIndex) =>
                                            innerIndex === index
                                              ? { ...item, is_active: event.target.checked }
                                              : item,
                                          ),
                                        }));
                                      }}
                                    />
                                    Activo
                                  </label>
                                </td>
                                <td className="px-3.5 py-3">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7 rounded-md"
                                      title="Subir rango: mueve esta fila una posición hacia arriba"
                                      aria-label="Subir rango"
                                      onClick={() => moveRangeRow(index, -1)}
                                    >
                                      <ArrowUp className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7 rounded-md"
                                      title="Bajar rango: mueve esta fila una posición hacia abajo"
                                      aria-label="Bajar rango"
                                      onClick={() => moveRangeRow(index, 1)}
                                    >
                                      <ArrowDown className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7 rounded-md"
                                      title="Eliminar rango: quita esta fila de la promoción"
                                      aria-label="Eliminar rango"
                                      onClick={() => {
                                        setDraft((current) => ({
                                          ...current,
                                          rangePrices: current.rangePrices.filter((_, innerIndex) => innerIndex !== index),
                                        }));
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="pt-1 text-xs text-muted-foreground">
                        Los rangos deben ser consecutivos y no pueden superponerse. El último rango puede quedar abierto.
                      </p>
                    </>
                  )}
                </section>
              </div>

              <aside id="step-simulation" className="space-y-4 rounded-2xl border border-border/80 bg-white p-4 lg:sticky lg:top-3 lg:h-fit">
                <div className="space-y-1.5">
                  <p className="text-xl font-semibold text-slate-900">4. Simulación en tiempo real</p>
                  <p className="text-sm leading-5 text-muted-foreground">
                    Prueba diferentes cantidades para ver cómo se aplicará la promoción.
                  </p>
                </div>

                <label className="space-y-1.5">
                  <span className="text-xs leading-5 text-muted-foreground">Cantidad a probar</span>
                  <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-white px-2.5">
                    <button
                      type="button"
                      aria-label="Disminuir cantidad a probar"
                      title="Disminuir cantidad"
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      onClick={() =>
                        setSimulationQty((current) => {
                          const qty = parsePositiveIntOrNull(current) ?? 1;
                          return String(Math.max(1, qty - 1));
                        })
                      }
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={simulationQty}
                      onChange={(event) => setSimulationQty(event.target.value)}
                      className="w-full bg-transparent text-center text-sm text-slate-950 outline-none"
                      placeholder="Ejemplo: 13"
                    />
                    <button
                      type="button"
                      aria-label="Aumentar cantidad a probar"
                      title="Aumentar cantidad"
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      onClick={() =>
                        setSimulationQty((current) => {
                          const qty = parsePositiveIntOrNull(current) ?? 1;
                          return String(qty + 1);
                        })
                      }
                    >
                      +
                    </button>
                    <span className="ml-3 shrink-0 text-sm text-slate-500">unidades</span>
                  </div>
                </label>

                <div
                  className={`rounded-xl border px-4 py-3 ${
                    isPromotionApplied ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <p className="text-sm text-slate-600">Resultado aplicable</p>
                  <p className="mt-1 inline-flex rounded-md border border-emerald-200 bg-emerald-100/70 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    {simulation.calculationTypeLabel}
                  </p>
                  <p className="mt-3 text-sm text-slate-600">Precio unitario aplicado</p>
                  <p className={`mt-1 text-3xl font-semibold ${isPromotionApplied ? "text-emerald-700" : "text-slate-900"}`}>
                    {simulation.unitPriceCrc != null ? formatCurrencyCRC(simulation.unitPriceCrc) : "No disponible"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white">
                  <p className="border-b border-slate-200 px-4 py-3 text-lg font-semibold text-slate-900">Resumen de cálculo</p>
                  <div className="text-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
                      <span className="text-slate-600">Cantidad solicitada</span>
                      <span className="font-medium text-slate-900">{simulation.requestedQty != null ? `${simulation.requestedQty} unidades` : "Sin definir"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
                      <span className="text-slate-600">Cantidad cotizada</span>
                      <span className="font-medium text-slate-900">{simulation.quotedQty != null ? `${simulation.quotedQty} unidades` : "Sin definir"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
                      <span className="text-slate-600">Tipo de promoción</span>
                      <span className="font-medium text-slate-900">{simulation.promotionTypeLabel}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <span className="text-slate-600">Tipo de cálculo aplicado</span>
                      <span className="font-medium text-slate-900">{simulation.calculationTypeLabel}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm text-slate-600">Total</p>
                  <p className="mt-1 text-3xl font-semibold text-slate-900">
                    {simulation.totalCrc != null ? formatCurrencyCRC(simulation.totalCrc) : "No disponible"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-sm font-medium text-slate-900">Explicación</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{simulation.explanation}</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-medium text-slate-900">Tip</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    La simulación es referencial. Los precios finales dependen de la validación completa del sistema.
                  </p>
                </div>
              </aside>
            </div>
          </section>
        </div>
      ) : null}

      {showConfigHelpPopup ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowConfigHelpPopup(false);
            }
          }}
        >
          <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_48px_-24px_rgba(2,6,23,0.35)]">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-slate-900">
                {draft.promoType === "blocks"
                  ? "Guía: configuración por bloques"
                  : "Guía: configuración por rangos"}
              </h4>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowConfigHelpPopup(false)}>
                Cerrar
              </Button>
            </div>

            {draft.promoType === "blocks" ? (
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <p>
                  <strong>Tamaño del paquete:</strong> Cantidad fija de unidades por bloque. Debe ser mayor a 0.
                </p>
                <p>
                  <strong>Cantidad máxima con precio especial:</strong> Última cantidad cubierta por los bloques exactos.
                </p>
                <p>
                  <strong>Precio por paquete adicional:</strong> Precio que se usa por cada paquete extra al superar el tope.
                </p>
                <p>
                  <strong>Agregar bloque:</strong> Crea filas de cantidad exacta y precio total del bloque.
                </p>
                <p>
                  <strong>Autocompletar bloques sugeridos:</strong> Genera bloques según tamaño de paquete y tope.
                </p>
                <p>
                  <strong>Reglas clave:</strong> Las cantidades exactas no se repiten, deben ser múltiplo del paquete y
                  estar entre el mínimo promocional y el tope.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <p>
                  <strong>Cantidad desde:</strong> Inicio del rango. Debe ser mayor a 0 y respetar el mínimo promocional.
                </p>
                <p>
                  <strong>Cantidad hasta:</strong> Fin del rango. Si lo dejas vacío, el rango queda abierto hacia arriba.
                </p>
                <p>
                  <strong>Precio por unidad:</strong> Precio unitario aplicado a todas las cantidades dentro del rango.
                </p>
                <p>
                  <strong>Agregar rango:</strong> Crea nuevas filas para definir tramos de cantidad.
                </p>
                <p>
                  <strong>Reglas clave:</strong> No puede haber solapamientos entre rangos y solo se permite un rango
                  abierto superior.
                </p>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

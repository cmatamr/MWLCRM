"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CircleDot,
  ImageIcon,
  Search,
  ShieldAlert,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import type {
  CatalogProductRow,
  PerformanceMetric,
  ProductDetail,
  ProductMode,
  ProductPerformanceTrendPoint,
  ProductPricingMode,
  ProductsPerformanceRange,
} from "@/components/products/types";
import {
  useProductDetail,
  useProductSearchMedia,
  useProductSkuPreview,
  useSaveProduct,
  useProductsCatalog,
  useProductsPerformance,
} from "@/hooks";
import { Button } from "@/components/ui/button";
import { useModalDismiss } from "@/components/ui/modal-dismiss";
import { StateDisplay, TableEmptyStateRow } from "@/components/ui/state-display";
import { StatusBadge } from "@/components/ui/status-badge";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { formatCurrencyCRC, formatDateTime } from "@/lib/formatters";
import {
  getFriendlyDiscountVisibilityLabel,
  getFriendlyFieldLabel,
  getFriendlyPricingModeLabel,
} from "@/lib/ui-labels";
import { FetcherError } from "@/lib/fetcher";
import {
  isSearchTermUsefulForNova,
  NOVA_SEARCH_TERM_QUALITY_RULE_EN,
  NOVA_SEARCH_TERM_QUALITY_RULE_ES,
} from "@/lib/products/search-term-quality";
import type {
  GetProductsPerformanceParams,
  ListCatalogProductsParams,
  ProductDiscountVisibility,
  SaveProductInput,
  UpdateProductInput,
} from "@/server/services/products";

type CatalogSidebarTab = "general" | "precios" | "busqueda" | "multimedia" | "reglas" | "seguridad";

type GlobalFilters = {
  category: string;
  family: string;
  estado: "all" | "active" | "inactive";
  agente: "all" | "visible" | "hidden";
  pricing_mode: "all" | ProductPricingMode;
  max_price_crc: string;
  min_qty: string;
  exact_product_id: string;
  more_filter: "none" | "integrity_alerts" | "high_boost";
};

type CreateProductDraft = {
  name: string;
  family: string;
  category: string;
  variant_label: string;
  size_label: string;
  material: string;
  search_terms_raw: string;
  publication_mode: "internal" | "nova";
  pricing_mode: ProductPricingMode;
  price_crc: string;
  price_from_crc: string;
  range_prices: Array<{
    local_id: string;
    range_min_qty: string;
    range_max_qty: string;
    unit_price_crc: string;
    is_open_ended: boolean;
    is_active: boolean;
  }>;
  min_qty: string;
  is_active: boolean;
  allows_name: boolean;
  requires_design_approval: boolean;
  is_discountable: boolean;
  discount_visibility: ProductDiscountVisibility;
  summary: string;
  details: string;
  notes: string;
  search_boost: string;
  sort_order: string;
};
type CreateRangeDraftRow = CreateProductDraft["range_prices"][number];

type SuggestionInputProps = {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  createOptionLabel: string;
  onChange: (value: string) => void;
};

function SuggestionInput({
  label,
  value,
  options,
  placeholder,
  createOptionLabel,
  onChange,
}: SuggestionInputProps) {
  const [isOpen, setIsOpen] = useState(false);

  const normalizedValue = value.trim().toLowerCase();
  const uniqueOptions = useMemo(
    () => Array.from(new Set(options.map((option) => option.trim()).filter(Boolean))),
    [options],
  );

  const filteredOptions = useMemo(() => {
    if (!normalizedValue) {
      return uniqueOptions.slice(0, 8);
    }

    return uniqueOptions.filter((option) => option.toLowerCase().includes(normalizedValue)).slice(0, 8);
  }, [normalizedValue, uniqueOptions]);

  const trimmedValue = value.trim();
  const canCreateNewOption =
    trimmedValue.length > 0 &&
    !uniqueOptions.some((option) => option.toLowerCase() === trimmedValue.toLowerCase());
  const createOptionPreviewValue = trimmedValue || "...";

  return (
    <label className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="relative">
        <input
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            setTimeout(() => setIsOpen(false), 120);
          }}
          placeholder={placeholder}
          className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
        />
        {isOpen ? (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border/80 bg-white shadow-[0_14px_35px_rgba(15,23,42,0.12)]">
            <ul className="max-h-52 overflow-y-auto py-1">
              <li>
                <button
                  type="button"
                  disabled={!canCreateNewOption}
                  className="w-full border-b border-border/70 px-3 py-2 text-left text-sm font-medium text-primary transition enabled:hover:bg-primary/5 disabled:cursor-not-allowed disabled:text-muted-foreground"
                  onMouseDown={(event) => {
                    if (!canCreateNewOption) {
                      return;
                    }

                    event.preventDefault();
                    onChange(trimmedValue);
                    setIsOpen(false);
                  }}
                >
                  {createOptionLabel}: &quot;{createOptionPreviewValue}&quot;
                </button>
              </li>
              {filteredOptions.map((option) => (
                <li key={option}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      onChange(option);
                      setIsOpen(false);
                    }}
                  >
                    {option}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </label>
  );
}

const catalogTabs: Array<{ id: CatalogSidebarTab; label: string }> = [
  { id: "general", label: "General" },
  { id: "precios", label: "Precios" },
  { id: "busqueda", label: "Busqueda + NOVA" },
  { id: "multimedia", label: "Multimedia" },
  { id: "reglas", label: "Reglas" },
  { id: "seguridad", label: "Seguridad" },
];

const defaultFilters: GlobalFilters = {
  category: "all",
  family: "all",
  estado: "all",
  agente: "all",
  pricing_mode: "all",
  max_price_crc: "",
  min_qty: "",
  exact_product_id: "",
  more_filter: "none",
};

const defaultCreateDraft: CreateProductDraft = {
  name: "",
  family: "",
  category: "",
  variant_label: "",
  size_label: "",
  material: "",
  search_terms_raw: "",
  publication_mode: "internal",
  pricing_mode: "fixed",
  price_crc: "",
  price_from_crc: "",
  range_prices: [],
  min_qty: "1",
  is_active: true,
  allows_name: false,
  requires_design_approval: false,
  is_discountable: false,
  discount_visibility: "never",
  summary: "",
  details: "",
  notes: "",
  search_boost: "0",
  sort_order: "0",
};

function normalizeValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function toSlugToken(rawValue: string) {
  const normalized = rawValue
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "draft";
}

function resolveStorageImageUrl(signedUrl: string | null | undefined) {
  const normalized = signedUrl?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function getPrimaryImage(product: ProductDetail) {
  const primaryFromTable = product.images.find((image) => image.is_primary);

  if (primaryFromTable) {
    return {
      storage_bucket: primaryFromTable.storage_bucket,
      storage_path: primaryFromTable.storage_path,
      signed_url: primaryFromTable.signed_url,
      alt_text: primaryFromTable.alt_text,
    };
  }

  if (product.search_meta.storage_bucket && product.search_meta.storage_path) {
    return {
      storage_bucket: product.search_meta.storage_bucket,
      storage_path: product.search_meta.storage_path,
      signed_url: product.search_meta.storage_signed_url,
      alt_text: product.search_meta.alt_text,
    };
  }

  return {
    storage_bucket: null,
    storage_path: null,
    signed_url: null,
    alt_text: null,
  };
}

type ProductPriceShape = Pick<ProductDetail, "pricing_mode" | "price_crc" | "price_from_crc">;
type NovaOperationalStatus = "ready" | "not_publishable" | "hidden" | "inactive";
type NovaOperationalAssessment = {
  status: NovaOperationalStatus;
  statusLabel: string;
  statusTone: "success" | "danger" | "warning";
  blockingIssues: string[];
  warnings: string[];
  activeDiscoveryTerms: number;
  hasVisibleContractViolation: boolean;
};

type OperationalFeedbackSeverity = "error" | "warning" | "info";
type OperationalFeedbackItem = {
  severity: OperationalFeedbackSeverity;
  message: string;
};

const feedbackToneBySeverity = {
  error: "danger",
  warning: "warning",
  info: "info",
} as const;

const feedbackLabelBySeverity = {
  error: "Error bloqueante",
  warning: "Advertencia",
  info: "Informacion",
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toFriendlyOperationalMessage(rawMessage: string): string {
  const normalized = rawMessage.trim();
  const lower = normalized.toLowerCase();

  if (
    lower.includes("summary is required") ||
    lower.includes("falta summary") ||
    lower.includes("agrega un summary")
  ) {
    return "Completa el resumen del producto para poder publicarlo en NOVA.";
  }

  if (
    lower.includes("discovery term") ||
    lower.includes("faltan search terms") ||
    lower.includes("at least one active search term") ||
    lower.includes("3 alphanumeric characters")
  ) {
    return NOVA_SEARCH_TERM_QUALITY_RULE_ES;
  }

  if (lower.includes("min_qty")) {
    return "La cantidad minima debe ser un numero mayor o igual a 1.";
  }

  if (
    lower.includes("pricing_mode") ||
    lower.includes("price_crc") ||
    lower.includes("price_from_crc") ||
    lower.includes("precio invalido")
  ) {
    return "Completa el precio segun el tipo de precio seleccionado.";
  }

  if (
    lower.includes("category is required") ||
    lower.includes("family is required") ||
    lower.includes("category y family son obligatorios") ||
    lower.includes("category cannot be empty") ||
    lower.includes("family cannot be empty") ||
    lower.includes("category must match") ||
    lower.includes("family must match") ||
    lower.includes("taxonomia incompleta")
  ) {
    return "Selecciona una categoria y una familia validas del catalogo.";
  }

  if (
    lower.includes("unable to generate sku: category code mapping not found") ||
    lower.includes("unable to generate sku: family code mapping not found")
  ) {
    return "No se pudo generar el SKU: falta mapping en catalog_sku_code_dictionary (scope business/mwl).";
  }

  if (
    lower.includes("cannot remain agent-visible") ||
    lower.includes("no se puede publicar al agente") ||
    lower.includes("no publicable para nova")
  ) {
    return "Este producto todavia no esta listo para publicarse en NOVA.";
  }

  if (
    lower.includes("invalid request parameters") ||
    lower.includes("invalid request parameter") ||
    lower.includes("bad request") ||
    lower.includes("request validation failed")
  ) {
    return "Hay datos incompletos o inválidos. Revisa nombre, categoría, familia, modalidad de precio, cantidad mínima, resumen y términos de búsqueda.";
  }

  if (lower.includes("is_active must be true")) {
    return "Activa el producto para publicarlo en NOVA.";
  }

  if (lower.includes("name must be descriptive") || lower.includes("nombre invalido")) {
    return "Revisa el nombre: debe ser claro y tener al menos 3 caracteres utiles.";
  }

  return normalized;
}

function dedupeFeedbackItems(items: OperationalFeedbackItem[]): OperationalFeedbackItem[] {
  const seen = new Set<string>();
  const deduped: OperationalFeedbackItem[] = [];

  for (const item of items) {
    const key = `${item.severity}:${item.message.trim().toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

function mapIssuesToFeedback(
  issues: string[],
  severity: Exclude<OperationalFeedbackSeverity, "info">,
): OperationalFeedbackItem[] {
  return issues.map((issue) => ({
    severity,
    message: toFriendlyOperationalMessage(issue),
  }));
}

function buildFeedbackFromNovaValidation(input: {
  blockingIssues: string[];
  warnings: string[];
  activeDiscoveryTerms?: number;
}): OperationalFeedbackItem[] {
  const feedback: OperationalFeedbackItem[] = [
    ...mapIssuesToFeedback(input.blockingIssues, "error"),
    ...mapIssuesToFeedback(input.warnings, "warning"),
  ];

  if (typeof input.activeDiscoveryTerms === "number") {
    feedback.push({
      severity: "info",
      message: `Search terms activos y utiles: ${input.activeDiscoveryTerms}.`,
    });
  }

  if (input.blockingIssues.length === 0 && input.warnings.length === 0) {
    feedback.push({
      severity: "info",
      message: "No hay bloqueos ni advertencias para publicar este producto en NOVA.",
    });
  }

  return dedupeFeedbackItems(feedback);
}

function extractNovaValidationFromError(error: unknown): {
  blockingIssues: string[];
  warnings: string[];
} | null {
  if (!(error instanceof FetcherError) || !isRecord(error.details)) {
    return null;
  }

  const rawValidation = isRecord(error.details.novaValidation)
    ? error.details.novaValidation
    : isRecord(error.details)
      ? error.details
      : null;

  if (!rawValidation) {
    return null;
  }

  const blockingIssues = Array.isArray(rawValidation.blockingIssues)
    ? rawValidation.blockingIssues.filter((item): item is string => typeof item === "string")
    : [];
  const warnings = Array.isArray(rawValidation.warnings)
    ? rawValidation.warnings.filter((item): item is string => typeof item === "string")
    : [];

  if (blockingIssues.length === 0 && warnings.length === 0) {
    return null;
  }

  return { blockingIssues, warnings };
}

function FeedbackList({
  items,
  className = "",
}: {
  items: OperationalFeedbackItem[];
  className?: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      {items.map((item, index) => (
        <div
          key={`${item.severity}:${item.message}:${index}`}
          className="flex items-start gap-2 rounded-lg border border-border/60 bg-white/70 p-2"
        >
          <StatusBadge tone={feedbackToneBySeverity[item.severity]} className="shrink-0">
            {feedbackLabelBySeverity[item.severity]}
          </StatusBadge>
          <p className="pt-0.5 text-xs text-slate-800">{item.message}</p>
        </div>
      ))}
    </div>
  );
}

function getPriceValue(product: ProductPriceShape) {
  if (product.pricing_mode === "fixed") {
    return product.price_crc;
  }

  if (product.pricing_mode === "range") {
    return product.price_from_crc;
  }

  return product.price_crc ?? product.price_from_crc;
}

function getPriceModeLabel(pricingMode: ProductPricingMode) {
  return getFriendlyPricingModeLabel(pricingMode);
}

function getFormattedPrice(product: ProductPriceShape) {
  const value = getPriceValue(product);

  if (value == null) {
    return "Sin precio usable";
  }

  if (product.pricing_mode === "range") {
    return `Rangos desde ${formatCurrencyCRC(value)}`;
  }

  if (product.pricing_mode === "variable") {
    return `Variable (${formatCurrencyCRC(value)})`;
  }

  return formatCurrencyCRC(value);
}

function toUniqueNormalizedTerms(terms: string[]) {
  const unique = new Map<string, string>();

  for (const term of terms) {
    const normalized = term.trim();
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (!unique.has(key)) {
      unique.set(key, normalized);
    }
  }

  return Array.from(unique.values());
}

function getActiveDiscoveryTerms(product: ProductDetail) {
  return toUniqueNormalizedTerms(
    product.search_meta.search_terms
      .filter((term) => term.is_active)
      .map((term) => term.term)
      .filter(isSearchTermUsefulForNova),
  );
}

function assessNovaOperationalStatus(product: ProductDetail): NovaOperationalAssessment {
  const blockingIssues: string[] = [];
  const warnings: string[] = [];
  const normalizedName = product.name.trim();
  const normalizedCategory = product.category.trim();
  const normalizedFamily = product.family.trim();
  const normalizedVariant = product.variant_label?.trim() ?? "";
  const normalizedSummary = product.summary?.trim() ?? "";
  const activeSearchTerms = toUniqueNormalizedTerms(
    product.search_meta.search_terms
      .filter((term) => term.is_active)
      .map((term) => term.term),
  );
  const activeDiscoveryTerms = getActiveDiscoveryTerms(product);
  const invalidActiveSearchTerms = activeSearchTerms.filter(
    (term) => !isSearchTermUsefulForNova(term),
  );

  if (normalizedName.length < 3 || !/[a-z0-9]/i.test(normalizedName)) {
    blockingIssues.push("Nombre invalido: usa al menos 3 caracteres utiles.");
  }

  if (!normalizedCategory || !normalizedFamily) {
    blockingIssues.push("Category y family son obligatorios.");
  }

  if (product.pricing_mode === "fixed") {
    if (product.price_crc == null) {
      blockingIssues.push("Falta el precio principal para este modo de precio.");
    }
    if (product.price_from_crc != null) {
      blockingIssues.push("Este modo de precio no admite precio base de rangos.");
    }
  } else if (product.pricing_mode === "range") {
    if (product.price_from_crc == null) {
      blockingIssues.push("Falta el precio base de rangos para este modo de precio.");
    }
    if (product.price_crc != null) {
      blockingIssues.push("Este modo de precio no admite precio fijo.");
    }
  } else if (product.pricing_mode === "variable") {
    if (product.price_crc == null) {
      blockingIssues.push("Falta el precio base para precio variable.");
    }
    if (product.price_from_crc != null) {
      blockingIssues.push("Precio variable no admite precio base de rangos.");
    }
  } else {
    blockingIssues.push("Modo de precio invalido.");
  }

  if ((product.price_crc ?? 0) < 0 || (product.price_from_crc ?? 0) < 0) {
    blockingIssues.push("El precio no puede ser negativo.");
  }

  if (product.min_qty == null || product.min_qty < 1) {
    blockingIssues.push("La cantidad minima debe ser mayor o igual a 1.");
  }

  if (!normalizedSummary) {
    blockingIssues.push("Falta el resumen del producto.");
  } else if (normalizedSummary.length < 20) {
    warnings.push("El resumen es corto y puede reducir la calidad del descubrimiento.");
  }

  if (activeDiscoveryTerms.length === 0 || invalidActiveSearchTerms.length > 0) {
    blockingIssues.push(NOVA_SEARCH_TERM_QUALITY_RULE_ES);
  } else if (activeDiscoveryTerms.length < 2) {
    warnings.push("Solo hay un termino de busqueda activo. Conviene agregar variantes.");
  }

  if (normalizedVariant.length > 0) {
    const loweredVariant = normalizedVariant.toLowerCase();
    if (loweredVariant === normalizedName.toLowerCase()) {
      blockingIssues.push("variant_label no puede ser idéntico al nombre.");
    }
    if (normalizedCategory && loweredVariant === normalizedCategory.toLowerCase()) {
      blockingIssues.push("variant_label debe aportar más contexto que category.");
    }
    if (normalizedFamily && loweredVariant === normalizedFamily.toLowerCase()) {
      blockingIssues.push("variant_label debe aportar más contexto que family.");
    }
    if (normalizedVariant.length < 3) {
      warnings.push("La variante es muy corta. Revisa la coherencia del nombre.");
    }
  }

  if (!product.is_discountable && product.discount_visibility !== "never") {
    blockingIssues.push("La configuracion de descuento no es valida para este producto.");
  }

  if (!product.is_active) {
    return {
      status: "inactive",
      statusLabel: "Inactivo",
      statusTone: "warning",
      blockingIssues,
      warnings,
      activeDiscoveryTerms: activeDiscoveryTerms.length,
      hasVisibleContractViolation: product.is_agent_visible,
    };
  }

  if (!product.is_agent_visible) {
    return {
      status: "hidden",
      statusLabel: "Oculto al agente",
      statusTone: "warning",
      blockingIssues,
      warnings,
      activeDiscoveryTerms: activeDiscoveryTerms.length,
      hasVisibleContractViolation: false,
    };
  }

  if (blockingIssues.length > 0) {
    return {
      status: "not_publishable",
      statusLabel: "No publicable para NOVA",
      statusTone: "danger",
      blockingIssues,
      warnings,
      activeDiscoveryTerms: activeDiscoveryTerms.length,
      hasVisibleContractViolation: true,
    };
  }

  return {
    status: "ready",
    statusLabel: "Listo para NOVA",
    statusTone: "success",
    blockingIssues,
    warnings,
    activeDiscoveryTerms: activeDiscoveryTerms.length,
    hasVisibleContractViolation: false,
  };
}

function getIntegrityAlerts(product: ProductDetail) {
  const alerts: string[] = [];
  const primaryImage = getPrimaryImage(product);

  if (!primaryImage.storage_bucket || !primaryImage.storage_path) {
    alerts.push("Sin imagen primaria");
  }

  if (!product.summary?.trim()) {
    alerts.push("Sin summary");
  }

  if (product.search_meta.aliases.length === 0) {
    alerts.push("Sin aliases");
  }

  const hasUsablePrice =
    (product.pricing_mode === "fixed" && product.price_crc != null) ||
    (product.pricing_mode === "range" && product.price_from_crc != null) ||
    (product.pricing_mode === "variable" &&
      (product.price_crc != null || product.price_from_crc != null));

  if (!hasUsablePrice) {
    alerts.push("Sin precio usable");
  }

  const hasPricingModeMismatch =
    (product.pricing_mode === "fixed" && product.price_crc == null) ||
    (product.pricing_mode === "range" && product.price_from_crc == null);

  if (hasPricingModeMismatch) {
    alerts.push("pricing_mode inconsistente");
  }

  return alerts;
}

function toCatalogRow(product: ProductDetail): CatalogProductRow {
  const primaryImage = getPrimaryImage(product);

  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    family: product.family,
    variant_label: product.variant_label,
    size_label: product.size_label,
    pricing_mode: product.pricing_mode,
    price_crc: product.price_crc,
    price_from_crc: product.price_from_crc,
    min_qty: product.min_qty,
    is_active: product.is_active,
    is_agent_visible: product.is_agent_visible,
    summary: product.summary,
    details: product.details,
    notes: product.notes,
    source_type: product.source_type,
    source_ref: product.source_ref,
    search_boost: product.search_boost,
    updated_at: product.updated_at,
    primary_image_bucket: primaryImage.storage_bucket,
    primary_image_path: primaryImage.storage_path,
    primary_image_signed_url: primaryImage.signed_url,
    primary_image_alt: primaryImage.alt_text,
    aliases: product.search_meta.aliases,
    integrity_alerts: getIntegrityAlerts(product),
  };
}

function toProductDetailStub(row: CatalogProductRow): ProductDetail {
  return {
    id: row.id,
    sku: row.sku,
    family: row.family,
    name: row.name,
    category: row.category,
    variant_label: row.variant_label,
    size_label: row.size_label,
    width_cm: null,
    height_cm: null,
    depth_cm: null,
    material: null,
    base_color: null,
    print_type: null,
    personalization_area: null,
    price_crc: row.price_crc,
    price_from_crc: row.price_from_crc,
    min_qty: row.min_qty,
    allows_name: false,
    includes_design_adjustment_count: 0,
    extra_adjustment_has_cost: false,
    requires_design_approval: true,
    is_full_color: false,
    is_premium: false,
    is_discountable: false,
    discount_visibility: "only_if_customer_requests",
    pricing_mode: row.pricing_mode,
    summary: row.summary,
    details: row.details,
    notes: row.notes,
    source_type: row.source_type,
    source_ref: row.source_ref,
    is_active: row.is_active,
    is_agent_visible: row.is_agent_visible,
    sort_order: 0,
    updated_at: row.updated_at,
    search_boost: row.search_boost,
    images: [],
    search_meta: {
      aliases: row.aliases,
      alias_entries: [],
      search_terms: [],
      source_type: row.source_type,
      source_ref: row.source_ref,
      search_boost: row.search_boost,
      storage_bucket: row.primary_image_bucket,
      storage_path: row.primary_image_path,
      storage_signed_url: row.primary_image_signed_url,
      alt_text: row.primary_image_alt,
      exact_match: false,
      direct_match: false,
      match_quality: "weak",
      score: 0,
    },
    discount_rules: [],
    range_prices: [],
    pricing_engine_hint: null,
    integrity_alerts: row.integrity_alerts,
    ui_created_locally: false,
  };
}

function toUpdatePayload(product: ProductDetail): UpdateProductInput {
  return {
    name: product.name,
    category: product.category,
    family: product.family,
    variant_label: product.variant_label,
    size_label: product.size_label,
    material: product.material,
    base_color: product.base_color,
    print_type: product.print_type,
    personalization_area: product.personalization_area,
    summary: product.summary,
    details: product.details,
    notes: product.notes,
    pricing_mode: product.pricing_mode,
    price_crc: product.price_crc,
    price_from_crc: product.price_from_crc,
    min_qty: product.min_qty,
    is_active: product.is_active,
    is_agent_visible: product.is_agent_visible,
    allows_name: product.allows_name,
    includes_design_adjustment_count: product.includes_design_adjustment_count,
    extra_adjustment_has_cost: product.extra_adjustment_has_cost,
    requires_design_approval: product.requires_design_approval,
    is_full_color: product.is_full_color,
    is_premium: product.is_premium,
    is_discountable: product.is_discountable,
    discount_visibility: product.discount_visibility,
    search_boost: product.search_boost,
    sort_order: product.sort_order,
  };
}

type PendingChangesSnapshot = {
  core: UpdateProductInput;
  search_meta: {
    aliases: string[];
    search_terms: Array<{
      term: string;
      term_type: "alias";
      priority: number;
      is_active: boolean;
      notes: string | null;
    }>;
  };
  images: Array<{
    storage_bucket: string;
    storage_path: string;
    alt_text: string | null;
    is_primary: boolean;
    sort_order: number;
  }>;
  range_prices: Array<{
    range_min_qty: number;
    range_max_qty: number | null;
    unit_price_crc: number;
    sort_order: number;
    is_active: boolean;
  }>;
};

function normalizeAliasTokens(aliases: string[]) {
  return toUniqueNormalizedTerms(aliases).sort((left, right) =>
    left.localeCompare(right, "es", { sensitivity: "base" }),
  );
}

function buildPendingChangesSnapshot(product: ProductDetail): PendingChangesSnapshot {
  const aliasesFromEntries = product.search_meta.alias_entries.map((entry) => entry.alias);
  const aliasesSource =
    aliasesFromEntries.length > 0 ? aliasesFromEntries : product.search_meta.aliases;

  const normalizedSearchTerms = product.search_meta.search_terms
    .map((term) => ({
      term: term.term.trim(),
      term_type: "alias" as const,
      priority: term.priority,
      is_active: term.is_active,
      notes: term.notes?.trim() || null,
    }))
    .filter((term) => term.term.length > 0)
    .sort((left, right) =>
      `${left.term.toLowerCase()}|${left.priority}|${left.is_active ? "1" : "0"}|${left.notes ?? ""}`.localeCompare(
        `${right.term.toLowerCase()}|${right.priority}|${right.is_active ? "1" : "0"}|${right.notes ?? ""}`,
        "es",
        { sensitivity: "base" },
      ),
    );

  const normalizedImages = product.images
    .map((image) => ({
      storage_bucket: image.storage_bucket.trim() || "mwl-products",
      storage_path: image.storage_path.trim(),
      alt_text: image.alt_text?.trim() || null,
      is_primary: image.is_primary,
      sort_order: image.sort_order,
    }))
    .filter((image) => image.storage_path.length > 0)
    .sort((left, right) =>
      `${left.sort_order}|${left.storage_bucket.toLowerCase()}|${left.storage_path.toLowerCase()}`.localeCompare(
        `${right.sort_order}|${right.storage_bucket.toLowerCase()}|${right.storage_path.toLowerCase()}`,
        "es",
        { sensitivity: "base" },
      ),
    );

  const normalizedRangePrices = sortRangePriceRows(
    product.range_prices
      .map((range) => ({
        range_min_qty: range.range_min_qty,
        range_max_qty: range.range_max_qty ?? null,
        unit_price_crc: range.unit_price_crc,
        sort_order: range.sort_order,
        is_active: range.is_active,
      }))
      .filter((range) => range.range_min_qty > 0 && range.unit_price_crc > 0),
  );

  return {
    core: toUpdatePayload(product),
    search_meta: {
      aliases: normalizeAliasTokens(aliasesSource),
      search_terms: normalizedSearchTerms,
    },
    images: normalizedImages,
    range_prices: normalizedRangePrices,
  };
}

function validateProductPayloadForSave(
  payload: UpdateProductInput,
  rangePrices: ProductDetail["range_prices"] = [],
): string | null {
  const name = payload.name?.trim() ?? "";
  if (!name) {
    return "Completa el nombre del producto.";
  }
  const category = payload.category?.trim() ?? "";
  if (!category) {
    return "Selecciona una categoria valida.";
  }
  const family = payload.family?.trim() ?? "";
  if (!family) {
    return "Selecciona una familia valida.";
  }

  const pricingMode = payload.pricing_mode;
  if (!pricingMode) {
    return "Selecciona un tipo de precio.";
  }

  if (payload.price_crc != null && payload.price_crc < 0) {
    return "El precio no puede ser negativo.";
  }
  if (payload.price_from_crc != null && payload.price_from_crc < 0) {
    return "El precio no puede ser negativo.";
  }
  if (payload.min_qty != null && payload.min_qty < 1) {
    return "La cantidad minima debe ser mayor o igual a 1.";
  }

  if (pricingMode === "fixed" && payload.price_crc == null) {
    return "Completa el precio principal para continuar.";
  }
  if (pricingMode === "fixed" && payload.price_from_crc != null) {
    return "Este tipo de precio no admite precio base de rangos.";
  }
  if (pricingMode === "range" && payload.price_from_crc == null) {
    return "Completa el precio base de rangos para continuar.";
  }
  if (pricingMode === "range" && payload.price_crc != null) {
    return "Este tipo de precio no admite precio fijo.";
  }
  if (pricingMode === "range") {
    const rangeValidation = validateRangePricesForUi(
      rangePrices.map((range) => ({
        range_min_qty: range.range_min_qty,
        range_max_qty: range.range_max_qty ?? null,
        unit_price_crc: range.unit_price_crc,
        is_active: range.is_active,
      })),
    );
    if (rangeValidation) {
      return rangeValidation;
    }
  }
  if (pricingMode === "variable" && payload.price_crc == null) {
    return "Completa el precio base para precio variable.";
  }
  if (pricingMode === "variable" && payload.price_from_crc != null) {
    return "Precio variable no admite precio base de rangos.";
  }

  if (!payload.is_discountable && payload.discount_visibility !== "never") {
    return "Ajusta la configuracion de descuento para continuar.";
  }

  return null;
}

function toNumberOrNull(rawValue: string) {
  const normalized = rawValue.trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDecimalRawInput(rawValue: string) {
  const sanitized = rawValue.replace(/\s+/g, "").replace(/,/g, ".").replace(/[^0-9.]/g, "");

  if (!sanitized) {
    return "";
  }

  const firstDotIndex = sanitized.indexOf(".");
  const hasDot = firstDotIndex >= 0;
  const integerPartRaw = hasDot ? sanitized.slice(0, firstDotIndex) : sanitized;
  const decimalRaw = hasDot ? sanitized.slice(firstDotIndex + 1) : "";

  const integerPart = integerPartRaw.replace(/\./g, "").replace(/^0+(?=\d)/, "");
  const normalizedInteger = integerPart || "0";
  const normalizedDecimal = decimalRaw.replace(/\./g, "").slice(0, 2);

  if (!hasDot) {
    return normalizedInteger;
  }

  if (normalizedDecimal.length === 0 && rawValue.trim().endsWith(".")) {
    return `${normalizedInteger}.`;
  }

  return normalizedDecimal.length > 0 ? `${normalizedInteger}.${normalizedDecimal}` : normalizedInteger;
}

function toDecimalOrNull(rawValue: string) {
  const normalized = rawValue.trim().replace(/\s+/g, "");

  if (!normalized) {
    return null;
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDecimalDisplay(rawValue: string) {
  const parsed = toDecimalOrNull(rawValue);

  if (parsed == null) {
    return "";
  }

  const [integerPart = "0", decimalPart = "00"] = parsed.toFixed(2).split(".");
  const integerWithSpaces = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  return `${integerWithSpaces}.${decimalPart}`;
}

function sortRangePriceRows<T extends { range_min_qty: number; sort_order: number }>(
  rows: T[],
) {
  return [...rows].sort((left, right) => {
    if (left.range_min_qty !== right.range_min_qty) {
      return left.range_min_qty - right.range_min_qty;
    }

    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }
    return 0;
  });
}

function sortCreateRangeDraftRows(rows: CreateRangeDraftRow[]) {
  return [...rows].sort((left, right) => {
    const leftMin = toNumberOrNull(left.range_min_qty);
    const rightMin = toNumberOrNull(right.range_min_qty);

    if (leftMin != null && rightMin != null && leftMin !== rightMin) {
      return leftMin - rightMin;
    }

    if (leftMin != null && rightMin == null) {
      return -1;
    }

    if (leftMin == null && rightMin != null) {
      return 1;
    }

    return left.local_id.localeCompare(right.local_id, "es", { sensitivity: "base" });
  });
}

function validateRangePricesForUi(
  input: Array<{
    range_min_qty: number;
    range_max_qty: number | null;
    unit_price_crc: number;
    is_active: boolean;
  }>,
): string | null {
  if (input.length === 0) {
    return "Agrega al menos un rango estructural para precio por rangos.";
  }

  let activeRows = 0;
  let openActiveRows = 0;

  for (const range of input) {
    if (!Number.isInteger(range.range_min_qty) || range.range_min_qty < 1) {
      return "Cada rango debe tener un mínimo válido mayor o igual a 1.";
    }

    if (range.range_max_qty != null) {
      if (!Number.isInteger(range.range_max_qty) || range.range_max_qty < range.range_min_qty) {
        return "El máximo del rango debe ser mayor o igual al mínimo.";
      }
    }

    if (!Number.isInteger(range.unit_price_crc) || range.unit_price_crc <= 0) {
      return "El precio unitario del rango debe ser mayor que 0.";
    }

    if (range.is_active) {
      activeRows += 1;
      if (range.range_max_qty == null) {
        openActiveRows += 1;
      }
    }
  }

  if (activeRows === 0) {
    return "Debe existir al menos un rango activo.";
  }

  if (openActiveRows > 1) {
    return "Solo se permite un rango abierto activo.";
  }

  return null;
}

function validateCreateDraft(draft: CreateProductDraft): string | null {
  if (!draft.name.trim()) {
    return "Completa el nombre del producto.";
  }
  if (!draft.category.trim()) {
    return "Selecciona una categoria valida.";
  }
  if (!draft.family.trim()) {
    return "Selecciona una familia valida.";
  }

  const minQty = toNumberOrNull(draft.min_qty);
  if (minQty == null || minQty < 1) {
    return "La cantidad minima debe ser mayor o igual a 1.";
  }

  const price = toDecimalOrNull(draft.price_crc);
  const priceFrom = toDecimalOrNull(draft.price_from_crc);

  if (draft.pricing_mode === "fixed" && price == null) {
    return "Completa el precio principal para continuar.";
  }
  if (draft.pricing_mode === "fixed" && priceFrom != null) {
    return "Este tipo de precio no admite precio base de rangos.";
  }
  if (draft.pricing_mode === "range" && priceFrom == null) {
    return "Completa el precio base de rangos para continuar.";
  }
  if (draft.pricing_mode === "range" && price != null) {
    return "Este tipo de precio no admite precio fijo.";
  }
  if (draft.pricing_mode === "range") {
    const normalizedRanges = draft.range_prices
      .map((range) => ({
        range_min_qty: toNumberOrNull(range.range_min_qty),
        range_max_qty: range.is_open_ended ? null : toNumberOrNull(range.range_max_qty),
        unit_price_crc: toNumberOrNull(range.unit_price_crc),
        is_active: range.is_active,
      }))
      .map((range) => ({
        range_min_qty: range.range_min_qty ?? 0,
        range_max_qty: range.range_max_qty,
        unit_price_crc: range.unit_price_crc ?? 0,
        is_active: range.is_active,
      }));

    const rangeValidation = validateRangePricesForUi(normalizedRanges);
    if (rangeValidation) {
      return rangeValidation;
    }
  }
  if (draft.pricing_mode === "variable" && price == null) {
    return "Completa el precio base para precio variable.";
  }
  if (draft.pricing_mode === "variable" && priceFrom != null) {
    return "Precio variable no admite precio base de rangos.";
  }
  if (!draft.is_discountable && draft.discount_visibility !== "never") {
    return "Ajusta la configuracion de descuento para continuar.";
  }

  return null;
}

function parseSearchTermsRawInput(rawValue: string): string[] {
  const uniqueByLower = new Map<string, string>();
  const chunks = rawValue
    .split(/[\n,;]+/g)
    .map((token) => token.trim())
    .filter(Boolean);

  for (const chunk of chunks) {
    const normalized = chunk.toLowerCase();
    if (!uniqueByLower.has(normalized)) {
      uniqueByLower.set(normalized, chunk);
    }
  }

  return Array.from(uniqueByLower.values());
}

function validateCreateDraftForNova(draft: CreateProductDraft): {
  isNovaReady: boolean;
  blockingIssues: string[];
  warnings: string[];
  usableSearchTerms: string[];
} {
  const blockingIssues: string[] = [];
  const warnings: string[] = [];
  const normalizedName = draft.name.trim();
  const normalizedFamily = draft.family.trim();
  const normalizedCategory = draft.category.trim();
  const normalizedVariant = draft.variant_label.trim();
  const normalizedSummary = draft.summary.trim();
  const allSearchTerms = parseSearchTermsRawInput(draft.search_terms_raw);
  const usableSearchTerms = allSearchTerms.filter(isSearchTermUsefulForNova);
  const invalidSearchTerms = allSearchTerms.filter((term) => !isSearchTermUsefulForNova(term));

  if (!draft.is_active) {
    blockingIssues.push("Activa el producto para poder publicarlo en NOVA.");
  }

  if (!normalizedSummary) {
    blockingIssues.push("Completa el resumen del producto.");
  } else if (normalizedSummary.length < 20) {
    warnings.push("El resumen es corto y puede reducir la calidad del descubrimiento.");
  }

  if (usableSearchTerms.length === 0 || invalidSearchTerms.length > 0) {
    blockingIssues.push(NOVA_SEARCH_TERM_QUALITY_RULE_ES);
  } else if (usableSearchTerms.length < 2) {
    warnings.push("Solo hay un termino de busqueda. Conviene agregar variantes.");
  }

  if (normalizedVariant) {
    const loweredVariant = normalizedVariant.toLowerCase();
    if (loweredVariant === normalizedName.toLowerCase()) {
      blockingIssues.push("variant_label no puede ser igual al nombre.");
    }
    if (loweredVariant === normalizedFamily.toLowerCase()) {
      blockingIssues.push("variant_label debe agregar contexto más allá de family.");
    }
    if (loweredVariant === normalizedCategory.toLowerCase()) {
      blockingIssues.push("variant_label debe agregar contexto más allá de category.");
    }
    if (normalizedVariant.length < 3) {
      warnings.push("variant_label es muy corto; revisa consistencia.");
    }
  }

  return {
    isNovaReady: blockingIssues.length === 0,
    blockingIssues,
    warnings,
    usableSearchTerms,
  };
}

function buildCreatePayloadFromDraft(draft: CreateProductDraft): SaveProductInput["product"] {
  return {
    name: draft.name.trim(),
    category: draft.category.trim(),
    family: draft.family.trim(),
    variant_label: draft.variant_label.trim() || null,
    size_label: draft.size_label.trim() || null,
    material: draft.material.trim() || null,
    pricing_mode: draft.pricing_mode,
    price_crc: toDecimalOrNull(draft.price_crc),
    price_from_crc: toDecimalOrNull(draft.price_from_crc),
    min_qty: toNumberOrNull(draft.min_qty) ?? 1,
    is_active: draft.is_active,
    allows_name: draft.allows_name,
    requires_design_approval: draft.requires_design_approval,
    is_discountable: draft.is_discountable,
    discount_visibility: draft.discount_visibility,
    summary: draft.summary.trim() || null,
    details: draft.details.trim() || null,
    notes: draft.notes.trim() || null,
    search_boost: toNumberOrNull(draft.search_boost) ?? 0,
    sort_order: toNumberOrNull(draft.sort_order) ?? 0,
  };
}

function buildSaveProductPayloadFromDetail(product: ProductDetail): SaveProductInput["product"] {
  return {
    name: product.name,
    category: product.category,
    family: product.family,
    variant_label: product.variant_label,
    size_label: product.size_label,
    material: product.material,
    base_color: product.base_color,
    print_type: product.print_type,
    personalization_area: product.personalization_area,
    summary: product.summary,
    details: product.details,
    notes: product.notes,
    pricing_mode: product.pricing_mode,
    price_crc: product.price_crc,
    price_from_crc: product.price_from_crc,
    min_qty: product.min_qty ?? 1,
    is_active: product.is_active,
    allows_name: product.allows_name,
    includes_design_adjustment_count: product.includes_design_adjustment_count,
    extra_adjustment_has_cost: product.extra_adjustment_has_cost,
    requires_design_approval: product.requires_design_approval,
    is_full_color: product.is_full_color,
    is_premium: product.is_premium,
    is_discountable: product.is_discountable,
    discount_visibility: product.discount_visibility,
    search_boost: product.search_boost,
    sort_order: product.sort_order,
  };
}

function TrendChart({
  points,
  metric,
}: {
  points: ProductPerformanceTrendPoint[];
  metric: PerformanceMetric;
}) {
  const values = points.map((point) => (metric === "units" ? point.units_sold : point.revenue_crc));
  const maxValue = Math.max(...values, 1);
  const hasLongLabels = points.some((point) => point.label.length > 8);
  const maxTickLabels = hasLongLabels ? 4 : 7;
  const chartSeries = useMemo(
    () =>
      points.map((point, index) => {
        const value = values[index] ?? 0;
        return {
          ...point,
          value,
          x: values.length <= 1 ? 50 : (index / (values.length - 1)) * 100,
          y: 100 - (value / maxValue) * 100,
        };
      }),
    [maxValue, points, values],
  );
  const tickIndexes = useMemo(() => {
    if (points.length === 0) {
      return [];
    }

    if (points.length <= maxTickLabels) {
      return points.map((_, index) => index);
    }

    const indexes: number[] = [];
    const step = Math.ceil((points.length - 1) / (maxTickLabels - 1));
    for (let index = 0; index < points.length; index += step) {
      indexes.push(index);
    }

    const lastIndex = points.length - 1;
    if (indexes[indexes.length - 1] !== lastIndex) {
      indexes.push(lastIndex);
    }

    return indexes;
  }, [maxTickLabels, points]);

  const chartPoints = chartSeries.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="space-y-3">
      <svg viewBox="0 0 100 100" className="h-40 w-full overflow-visible rounded-2xl bg-slate-50 p-3">
        <polyline
          fill="none"
          stroke="hsl(var(--chart-1))"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={chartPoints}
        />
        {chartSeries.map((point, index) => {
          const tooltipValue =
            metric === "units" ? `${point.value.toLocaleString("es-CR")} unidades` : formatCurrencyCRC(point.value);

          return (
            <circle
              key={point.bucket_start}
              cx={point.x}
              cy={point.y}
              r="2.1"
              fill="hsl(var(--chart-1))"
              className={index === 0 || index === chartSeries.length - 1 ? "opacity-90" : "opacity-75"}
            >
              <title>{`${point.label}: ${tooltipValue}`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="relative h-4 text-xs text-muted-foreground">
        {tickIndexes.map((index) => {
          const point = points[index];
          if (!point) {
            return null;
          }

          const isFirst = index === 0;
          const isLast = index === points.length - 1;
          const left = isFirst ? "0%" : isLast ? "100%" : `${(index / (points.length - 1)) * 100}%`;

          return (
            <span
              key={point.bucket_start}
              className={`absolute top-0 whitespace-nowrap ${
                isFirst ? "translate-x-0 text-left" : isLast ? "-translate-x-full text-right" : "-translate-x-1/2 text-center"
              }`}
              style={{ left }}
            >
              {point.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function ProductsPageClient() {
  const pageSize = 7;
  const [products, setProducts] = useState<ProductDetail[]>([]);
  const [currentMode, setCurrentMode] = useState<ProductMode>("catalog");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [pendingSelectedProductId, setPendingSelectedProductId] = useState<string | null>(null);
  const [pendingMode, setPendingMode] = useState<ProductMode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [performanceMetric, setPerformanceMetric] = useState<PerformanceMetric>("units");
  const [filters, setFilters] = useState<GlobalFilters>(defaultFilters);
  const [catalogTab, setCatalogTab] = useState<CatalogSidebarTab>("general");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<ProductDetail | null>(null);
  const [editBaseline, setEditBaseline] = useState<ProductDetail | null>(null);
  const [isDiscardChangesOpen, setIsDiscardChangesOpen] = useState(false);
  const [isCreateDiscardChangesOpen, setIsCreateDiscardChangesOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showCreateHelpPopup, setShowCreateHelpPopup] = useState(false);
  const [showCreateDetailsPopup, setShowCreateDetailsPopup] = useState(false);
  const [showEditHelpPopup, setShowEditHelpPopup] = useState(false);
  const [isEditingCreatePriceCrc, setIsEditingCreatePriceCrc] = useState(false);
  const [isEditingCreatePriceFromCrc, setIsEditingCreatePriceFromCrc] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateProductDraft>(defaultCreateDraft);
  const [skuControlEnabled, setSkuControlEnabled] = useState(false);
  const [skuDraft, setSkuDraft] = useState("");
  const [topPeriod, setTopPeriod] = useState<ProductsPerformanceRange>("30d");
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);
  const [saveFeedbackItems, setSaveFeedbackItems] = useState<OperationalFeedbackItem[]>([]);
  const [createStatusMessage, setCreateStatusMessage] = useState<string | null>(null);
  const [createFeedbackItems, setCreateFeedbackItems] = useState<OperationalFeedbackItem[]>([]);
  const [newAlias, setNewAlias] = useState("");
  const [newImageDraft, setNewImageDraft] = useState({
    file: null as File | null,
    preview_url: null as string | null,
    alt_text: "",
    mark_as_primary: false,
  });
  const [newSearchTermDraft, setNewSearchTermDraft] = useState({
    term: "",
    priority: "100",
    is_active: true,
    notes: "",
  });
  const [searchMetaMessage, setSearchMetaMessage] = useState<string | null>(null);
  const [thumbnailLoadErrors, setThumbnailLoadErrors] = useState<Record<string, boolean>>({});
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [tempIdSeed, setTempIdSeed] = useState(-1);

  const { saveProduct, isPending: isSavingProduct } = useSaveProduct();
  const {
    addImage: addProductImageMutation,
    updateImage: updateProductImageMutation,
    deleteImage: deleteProductImageMutation,
    isPending: isUpdatingMedia,
  } = useProductSearchMedia();

  useEffect(() => {
    if (!isCreateOpen) {
      setShowCreateHelpPopup(false);
      setShowCreateDetailsPopup(false);
    }
  }, [isCreateOpen]);

  useEffect(() => {
    if (!isEditOpen) {
      setShowEditHelpPopup(false);
    }
  }, [isEditOpen]);

  useEffect(
    () => () => {
      if (newImageDraft.preview_url) {
        URL.revokeObjectURL(newImageDraft.preview_url);
      }
    },
    [newImageDraft.preview_url],
  );

  const catalogQueryParams = useMemo<ListCatalogProductsParams>(() => {
    return {
      search: searchQuery.trim() || undefined,
      category: filters.category === "all" ? undefined : filters.category,
      family: filters.family === "all" ? undefined : filters.family,
      isActive:
        filters.estado === "all"
          ? undefined
          : filters.estado === "active"
            ? true
            : false,
      isAgentVisible:
        filters.agente === "all"
          ? undefined
          : filters.agente === "visible"
            ? true
            : false,
      pricingMode: filters.pricing_mode === "all" ? undefined : filters.pricing_mode,
      maxPriceCrc: toNumberOrNull(filters.max_price_crc) ?? undefined,
      minQty: toNumberOrNull(filters.min_qty) ?? undefined,
      exactProductId: filters.exact_product_id.trim() || undefined,
      page: 1,
      // Fase 2: mover a paginacion interactiva del grid.
      pageSize: 120,
    };
  }, [filters, searchQuery]);

  const {
    data: catalogData,
    isLoading: isCatalogLoading,
    isError: isCatalogError,
    error: catalogError,
  } = useProductsCatalog(catalogQueryParams);

  const {
    data: selectedProductDetail,
    isLoading: isSelectedProductLoading,
    isError: isSelectedProductError,
  } = useProductDetail(selectedProductId);

  const performanceQueryParams = useMemo<GetProductsPerformanceParams>(
    () => ({
      range: topPeriod,
      search: catalogQueryParams.search,
      category: catalogQueryParams.category,
      family: catalogQueryParams.family,
      isActive: catalogQueryParams.isActive,
      isAgentVisible: catalogQueryParams.isAgentVisible,
      pricingMode: catalogQueryParams.pricingMode,
      maxPriceCrc: catalogQueryParams.maxPriceCrc,
      minQty: catalogQueryParams.minQty,
      exactProductId: catalogQueryParams.exactProductId,
    }),
    [catalogQueryParams, topPeriod],
  );

  const {
    data: performanceData,
    isLoading: isPerformanceLoading,
    isError: isPerformanceError,
    error: performanceError,
  } = useProductsPerformance(performanceQueryParams);

  useEffect(() => {
    if (!catalogData) {
      return;
    }

    setProducts((currentProducts) =>
      catalogData.items.map((row) => {
        const existing = currentProducts.find((product) => product.id === row.id);
        const base = toProductDetailStub(row);

        if (!existing) {
          return base;
        }

        return {
          ...existing,
          ...base,
          search_meta: {
            ...existing.search_meta,
            ...base.search_meta,
            search_terms: existing.search_meta.search_terms,
          },
          images: existing.images,
          discount_rules: existing.discount_rules,
        };
      }),
    );
  }, [catalogData]);

  useEffect(() => {
    if (!selectedProductDetail) {
      return;
    }

    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === selectedProductDetail.id ? selectedProductDetail : product,
      ),
    );
  }, [selectedProductDetail]);

  const categoryOptions = catalogData?.filters.categories ?? [];
  const familyOptions = catalogData?.filters.families ?? [];
  const variantOptions = catalogData?.filters.variants ?? [];
  const materialOptions = catalogData?.filters.materials ?? [];
  const sizeOptions = catalogData?.filters.sizes ?? [];

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (
        filters.more_filter === "integrity_alerts" &&
        (product.integrity_alerts?.length ?? 0) === 0
      ) {
        return false;
      }

      if (filters.more_filter === "high_boost" && product.search_boost < 4) {
        return false;
      }

      return true;
    });
  }, [filters.more_filter, products]);

  useEffect(() => {
    setCurrentPage(1);
  }, [currentMode, filters, searchQuery]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredProducts.length / pageSize)),
    [filteredProducts.length, pageSize],
  );

  useEffect(() => {
    setCurrentPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const paginatedProducts = useMemo(() => {
    const page = Math.min(currentPage, totalPages);
    const start = (page - 1) * pageSize;

    return filteredProducts.slice(start, start + pageSize);
  }, [currentPage, filteredProducts, pageSize, totalPages]);

  useEffect(() => {
    if (filteredProducts.length === 0) {
      setSelectedProductId(null);
      return;
    }

    if (!selectedProductId) {
      setSelectedProductId(filteredProducts[0]?.id ?? null);
      return;
    }

    const currentIsVisible = filteredProducts.some((product) => product.id === selectedProductId);

    if (!currentIsVisible) {
      setSelectedProductId(null);
    }
  }, [filteredProducts, selectedProductId]);

  const selectedProductBase = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );
  const selectedProduct = useMemo(() => {
    if (isEditOpen && editDraft && selectedProductBase && editDraft.id === selectedProductBase.id) {
      return editDraft;
    }

    return selectedProductBase;
  }, [editDraft, isEditOpen, selectedProductBase]);
  const selectedPrimaryImage = useMemo(
    () =>
      selectedProduct
        ? getPrimaryImage(selectedProduct)
        : { storage_bucket: null, storage_path: null, signed_url: null, alt_text: null },
    [selectedProduct],
  );
  const selectedPrimaryImageSrc = useMemo(
    () => resolveStorageImageUrl(selectedPrimaryImage.signed_url),
    [selectedPrimaryImage.signed_url],
  );

  const selectedProductEditablePayload = useMemo(
    () => (editDraft ? toUpdatePayload(editDraft) : null),
    [editDraft],
  );
  const pendingChangesSnapshot = useMemo(
    () => (editDraft ? buildPendingChangesSnapshot(editDraft) : null),
    [editDraft],
  );
  const baselinePendingChangesSnapshot = useMemo(
    () => (editBaseline ? buildPendingChangesSnapshot(editBaseline) : null),
    [editBaseline],
  );
  const hasPendingChanges = useMemo(() => {
    if (!pendingChangesSnapshot || !baselinePendingChangesSnapshot) {
      return false;
    }

    return JSON.stringify(pendingChangesSnapshot) !== JSON.stringify(baselinePendingChangesSnapshot);
  }, [baselinePendingChangesSnapshot, pendingChangesSnapshot]);
  const localValidationError = useMemo(() => {
    const payloadValidation = selectedProductEditablePayload
      ? validateProductPayloadForSave(
          selectedProductEditablePayload,
          editDraft?.range_prices ?? [],
        )
      : null;
    if (payloadValidation) {
      return payloadValidation;
    }

    if (!editDraft) {
      return null;
    }

    const hasInvalidActiveSearchTerm = editDraft.search_meta.search_terms.some(
      (term) => term.is_active && !isSearchTermUsefulForNova(term.term),
    );
    if (hasInvalidActiveSearchTerm) {
      return NOVA_SEARCH_TERM_QUALITY_RULE_EN;
    }

    return null;
  }, [editDraft, selectedProductEditablePayload]);
  const editNovaOperationalAssessment = useMemo(
    () => (editDraft ? assessNovaOperationalStatus(editDraft) : null),
    [editDraft],
  );
  const editNovaContractError = useMemo(() => {
    if (!editNovaOperationalAssessment?.hasVisibleContractViolation) {
      return null;
    }

    const firstBlockingIssue = editNovaOperationalAssessment.blockingIssues[0];
    if (!firstBlockingIssue) {
      return "No se puede publicar en NOVA mientras el producto no cumpla las validaciones requeridas.";
    }

    return `No se puede publicar en NOVA. ${toFriendlyOperationalMessage(
      firstBlockingIssue,
    )}`;
  }, [editNovaOperationalAssessment]);
  const editOperationalFeedback = useMemo(
    () =>
      editNovaOperationalAssessment
        ? buildFeedbackFromNovaValidation({
            blockingIssues: editNovaOperationalAssessment.blockingIssues,
            warnings: editNovaOperationalAssessment.warnings,
            activeDiscoveryTerms: editNovaOperationalAssessment.activeDiscoveryTerms,
          })
        : [],
    [editNovaOperationalAssessment],
  );
  const hasDraftFormsPendingChanges = Boolean(
    newAlias.trim() ||
      newImageDraft.file ||
      newImageDraft.alt_text.trim() ||
      newImageDraft.mark_as_primary ||
      newSearchTermDraft.term.trim() ||
      newSearchTermDraft.notes.trim() ||
      newSearchTermDraft.priority.trim() !== "100" ||
      !newSearchTermDraft.is_active,
  );
  const hasUnsavedChanges = isEditOpen && (hasPendingChanges || hasDraftFormsPendingChanges);

  useEffect(() => {
    if (!selectedProductBase) {
      setSkuDraft("");
      setSkuControlEnabled(false);
      setSaveStatusMessage(null);
      setSearchMetaMessage(null);
      return;
    }

    setSkuDraft(selectedProductBase.sku);
    setSkuControlEnabled(false);
    setSaveStatusMessage(null);
    setSaveFeedbackItems([]);
    setSearchMetaMessage(null);
    setNewAlias("");
    setNewImageDraft((current) => {
      if (current.preview_url) {
        URL.revokeObjectURL(current.preview_url);
      }

      return {
        file: null,
        preview_url: null,
        alt_text: "",
        mark_as_primary: false,
      };
    });
    setNewSearchTermDraft({
      term: "",
      priority: "100",
      is_active: true,
      notes: "",
    });
  }, [selectedProductBase]);

  const catalogRows = useMemo(() => paginatedProducts.map(toCatalogRow), [paginatedProducts]);
  const performanceRows = performanceData?.rows ?? [];

  const catalogKpis = catalogData?.kpis ?? {
    activeProducts: 0,
    agentVisibleProducts: 0,
    withAlerts: 0,
    withoutPrimaryImage: 0,
  };

  const topProductsByPeriod = useMemo(() => {
    if (!performanceData) {
      return [];
    }

    return performanceMetric === "units"
      ? performanceData.top_products.units
      : performanceData.top_products.revenue;
  }, [performanceData, performanceMetric]);

  const topReferenceValue = useMemo(() => {
    return Math.max(
      ...topProductsByPeriod.map((row) =>
        performanceMetric === "units" ? row.units_sold : row.revenue_crc,
      ),
      1,
    );
  }, [performanceMetric, topProductsByPeriod]);

  const createSkuPreviewInput = useMemo(
    () => ({
      category: createDraft.category,
      family: createDraft.family,
      variant_label: createDraft.variant_label || null,
      size_label: createDraft.size_label || null,
      material: createDraft.material || null,
    }),
    [
      createDraft.category,
      createDraft.family,
      createDraft.variant_label,
      createDraft.size_label,
      createDraft.material,
    ],
  );
  const shouldRequestCreateSkuPreview =
    isCreateOpen &&
    createDraft.category.trim().length > 0 &&
    createDraft.family.trim().length > 0;
  const {
    data: createSkuPreview,
    error: createSkuPreviewError,
    isFetching: isFetchingCreateSkuPreview,
  } = useProductSkuPreview(createSkuPreviewInput, shouldRequestCreateSkuPreview);

  const createSkuPreviewValue = useMemo(() => {
    if (!shouldRequestCreateSkuPreview) {
      return "";
    }

    return createSkuPreview?.sku ?? "";
  }, [createSkuPreview?.sku, shouldRequestCreateSkuPreview]);

  const createSkuPreviewWarning = useMemo(() => {
    if (!isCreateOpen) {
      return null;
    }

    if (!createDraft.category.trim() || !createDraft.family.trim()) {
      return "Completa categoria y familia para generar el SKU.";
    }

    if (isFetchingCreateSkuPreview) {
      return "Generando SKU con diccionario canonico...";
    }

    if (createSkuPreviewError) {
      return toFriendlyOperationalMessage(createSkuPreviewError.message);
    }

    if (!createSkuPreview?.sku) {
      return "No se pudo generar el SKU con los datos actuales.";
    }

    return null;
  }, [
    createDraft.category,
    createDraft.family,
    createSkuPreview?.sku,
    createSkuPreviewError,
    isCreateOpen,
    isFetchingCreateSkuPreview,
  ]);
  const createDraftNovaValidation = useMemo(
    () => validateCreateDraftForNova(createDraft),
    [createDraft],
  );
  const createDraftParsedSearchTerms = useMemo(
    () => parseSearchTermsRawInput(createDraft.search_terms_raw),
    [createDraft.search_terms_raw],
  );
  const createDraftOperationalFeedback = useMemo(
    () =>
      buildFeedbackFromNovaValidation({
        blockingIssues: createDraftNovaValidation.blockingIssues,
        warnings: createDraftNovaValidation.warnings,
        activeDiscoveryTerms: createDraftNovaValidation.usableSearchTerms.length,
      }),
    [createDraftNovaValidation],
  );
  const createIdentitySectionReady = useMemo(
    () =>
      Boolean(
        createDraft.name.trim() &&
          createDraft.category.trim() &&
          createDraft.family.trim() &&
          createSkuPreviewValue.trim(),
      ),
    [createDraft.category, createDraft.family, createDraft.name, createSkuPreviewValue],
  );
  const createPricingSectionReady = useMemo(() => {
    const hasMinQty = Boolean(createDraft.min_qty.trim());
    const hasPrice =
      createDraft.pricing_mode === "range"
        ? Boolean(createDraft.price_from_crc.trim())
        : Boolean(createDraft.price_crc.trim());
    const hasValidRanges =
      createDraft.pricing_mode !== "range" ||
      validateRangePricesForUi(
        createDraft.range_prices.map((range) => ({
          range_min_qty: toNumberOrNull(range.range_min_qty) ?? 0,
          range_max_qty: range.is_open_ended ? null : toNumberOrNull(range.range_max_qty),
          unit_price_crc: toNumberOrNull(range.unit_price_crc) ?? 0,
          is_active: range.is_active,
        })),
      ) == null;

    return hasMinQty && hasPrice && hasValidRanges;
  }, [
    createDraft.min_qty,
    createDraft.price_crc,
    createDraft.price_from_crc,
    createDraft.pricing_mode,
    createDraft.range_prices,
  ]);
  const createNovaContentSectionReady = useMemo(
    () =>
      Boolean(
        createDraft.summary.trim() && createDraftNovaValidation.usableSearchTerms.length > 0,
      ),
    [createDraft.summary, createDraftNovaValidation.usableSearchTerms.length],
  );
  const canPublishCreateDraftToNova = createDraftNovaValidation.isNovaReady;
  const isCreateRangePricingMode = createDraft.pricing_mode === "range";

  const resolveProductName = (productId: string | null) => {
    if (!productId) {
      return "Sin producto";
    }

    return (
      performanceRows.find((product) => product.id === productId)?.name ??
      products.find((product) => product.id === productId)?.name ??
      "Sin producto"
    );
  };

  function cloneProductForDraft(product: ProductDetail): ProductDetail {
    return JSON.parse(JSON.stringify(product)) as ProductDetail;
  }

  function openEditModal() {
    if (!selectedProductBase) {
      return;
    }

    const snapshot = cloneProductForDraft(selectedProductBase);
    if (!snapshot.is_discountable) {
      snapshot.discount_visibility = "never";
    }
    setEditBaseline(snapshot);
    setEditDraft(snapshot);
    setCatalogTab("general");
    setSaveStatusMessage(null);
    setSaveFeedbackItems([]);
    setSearchMetaMessage(null);
    setNewAlias("");
    if (newImageDraft.preview_url) {
      URL.revokeObjectURL(newImageDraft.preview_url);
    }
    setNewImageDraft({
      file: null,
      preview_url: null,
      alt_text: "",
      mark_as_primary: false,
    });
    setNewSearchTermDraft({
      term: "",
      priority: "100",
      is_active: true,
      notes: "",
    });
    setIsEditOpen(true);
  }

  function resetEditModalState() {
    setIsEditOpen(false);
    setEditDraft(null);
    setEditBaseline(null);
    setPendingSelectedProductId(null);
    setPendingMode(null);
    setIsDiscardChangesOpen(false);
    setSaveStatusMessage(null);
    setSaveFeedbackItems([]);
    setSearchMetaMessage(null);
    setNewAlias("");
    if (newImageDraft.preview_url) {
      URL.revokeObjectURL(newImageDraft.preview_url);
    }
    setNewImageDraft({
      file: null,
      preview_url: null,
      alt_text: "",
      mark_as_primary: false,
    });
    setNewSearchTermDraft({
      term: "",
      priority: "100",
      is_active: true,
      notes: "",
    });
  }

  function requestCloseEditModal() {
    if (!hasUnsavedChanges) {
      resetEditModalState();
      return;
    }

    setPendingSelectedProductId(null);
    setPendingMode(null);
    setIsDiscardChangesOpen(true);
  }

  const hasCreateUnsavedChanges =
    JSON.stringify(createDraft) !== JSON.stringify(defaultCreateDraft) ||
    createFeedbackItems.length > 0 ||
    createStatusMessage != null;

  const closeCreateModal = useCallback(() => {
    if (isSavingProduct) {
      return;
    }

    if (hasCreateUnsavedChanges) {
      setIsCreateDiscardChangesOpen(true);
      return;
    }

    setIsCreateOpen(false);
    setCreateStatusMessage(null);
    setCreateFeedbackItems([]);
  }, [hasCreateUnsavedChanges, isSavingProduct]);

  const { onBackdropMouseDown: onEditBackdropMouseDown } = useModalDismiss({
    isOpen: isEditOpen,
    onClose: requestCloseEditModal,
    isDisabled: isSavingProduct,
  });

  const { onBackdropMouseDown: onDiscardBackdropMouseDown } = useModalDismiss({
    isOpen: isDiscardChangesOpen,
    onClose: handleContinueEditing,
  });

  const { onBackdropMouseDown: onCreateBackdropMouseDown } = useModalDismiss({
    isOpen: isCreateOpen,
    onClose: closeCreateModal,
    isDisabled: isSavingProduct,
  });

  const { onBackdropMouseDown: onEditHelpBackdropMouseDown } = useModalDismiss({
    isOpen: showEditHelpPopup,
    onClose: () => setShowEditHelpPopup(false),
  });

  const { onBackdropMouseDown: onCreateDetailsBackdropMouseDown } = useModalDismiss({
    isOpen: showCreateDetailsPopup,
    onClose: () => setShowCreateDetailsPopup(false),
  });

  const { onBackdropMouseDown: onCreateHelpBackdropMouseDown } = useModalDismiss({
    isOpen: showCreateHelpPopup,
    onClose: () => setShowCreateHelpPopup(false),
  });

  function requestSelectProduct(nextProductId: string) {
    if (nextProductId === selectedProductId) {
      return;
    }

    if (isEditOpen && hasUnsavedChanges) {
      setPendingSelectedProductId(nextProductId);
      setPendingMode(null);
      setIsDiscardChangesOpen(true);
      return;
    }

    setSelectedProductId(nextProductId);
  }

  function requestSetCurrentMode(nextMode: ProductMode) {
    if (nextMode === currentMode) {
      return;
    }

    if (isEditOpen && hasUnsavedChanges) {
      setPendingMode(nextMode);
      setPendingSelectedProductId(null);
      setIsDiscardChangesOpen(true);
      return;
    }

    setCurrentMode(nextMode);
  }

  function handleDiscardChangesConfirm() {
    const nextSelectedProductId = pendingSelectedProductId;
    const nextMode = pendingMode;

    resetEditModalState();

    if (nextSelectedProductId) {
      setSelectedProductId(nextSelectedProductId);
    }

    if (nextMode) {
      setCurrentMode(nextMode);
    }
  }

  function handleContinueEditing() {
    setPendingSelectedProductId(null);
    setPendingMode(null);
    setIsDiscardChangesOpen(false);
  }

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const unsavedChangesMessage =
      "Hay cambios pendientes sin guardar. Si sales ahora, se perderan.";

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;

      if (!anchor) {
        return;
      }

      if (anchor.target && anchor.target !== "_self") {
        return;
      }

      if (anchor.hasAttribute("download")) {
        return;
      }

      const href = anchor.getAttribute("href")?.trim() ?? "";
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);
      if (nextUrl.href === currentUrl.href) {
        return;
      }

      const allowNavigation = window.confirm(unsavedChangesMessage);
      if (!allowNavigation) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    let isHandlingPopState = false;
    const handlePopState = () => {
      if (isHandlingPopState) {
        return;
      }

      const allowNavigation = window.confirm(unsavedChangesMessage);
      if (allowNavigation) {
        return;
      }

      isHandlingPopState = true;
      window.history.go(1);
      window.setTimeout(() => {
        isHandlingPopState = false;
      }, 0);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [hasUnsavedChanges]);

  function updateSelectedProductField<K extends keyof ProductDetail>(
    field: K,
    value: ProductDetail[K],
  ) {
    if (!editDraft) {
      return;
    }

    setEditDraft((current) => (current ? { ...current, [field]: value } : current));
    setSaveStatusMessage(null);
    setSaveFeedbackItems([]);
  }

  function applySkuDraft() {
    // Fase 2 mantiene SKU como solo lectura.
  }

  async function createLocalProduct() {
    const validationError = validateCreateDraft(createDraft);
    if (validationError) {
      const friendlyMessage = toFriendlyOperationalMessage(validationError);
      setCreateStatusMessage(friendlyMessage);
      setCreateFeedbackItems([{ severity: "error", message: friendlyMessage }]);
      return;
    }

    const wantsNovaPublication = createDraft.publication_mode === "nova";
    if (wantsNovaPublication && !createDraftNovaValidation.isNovaReady) {
      setCreateStatusMessage("Este producto no se puede publicar en NOVA todavia.");
      setCreateFeedbackItems(createDraftOperationalFeedback);
      return;
    }

    const payload = buildCreatePayloadFromDraft(createDraft);
    if (isFetchingCreateSkuPreview) {
      setCreateStatusMessage("Generando SKU con diccionario canonico. Espera un momento.");
      setCreateFeedbackItems([
        {
          severity: "warning",
          message: "El preview de SKU aun se esta resolviendo con catalog_sku_code_dictionary.",
        },
      ]);
      return;
    }

    if (createSkuPreviewError || !createSkuPreview?.sku) {
      const message = createSkuPreviewError
        ? toFriendlyOperationalMessage(createSkuPreviewError.message)
        : "No se pudo generar un SKU valido con catalog_sku_code_dictionary (scope business/mwl).";
      setCreateStatusMessage(message);
      setCreateFeedbackItems([{ severity: "error", message }]);
      return;
    }

    setCreateFeedbackItems([]);
    setCreateStatusMessage("Creando producto...");

    try {
      const searchableTerms = createDraftNovaValidation.usableSearchTerms.map((term) => ({
        term,
        term_type: "alias" as const,
        priority: 100,
        is_active: true,
      }));
      const normalizedRangePrices =
        createDraft.pricing_mode === "range"
          ? sortRangePriceRows(
              createDraft.range_prices
                .map((range, index) => ({
                  id: null,
                  range_min_qty: toNumberOrNull(range.range_min_qty),
                  range_max_qty: range.is_open_ended ? null : toNumberOrNull(range.range_max_qty),
                  unit_price_crc: toNumberOrNull(range.unit_price_crc),
                  sort_order: index,
                  is_active: range.is_active,
                }))
                .filter(
                  (range): range is {
                    id: null;
                    range_min_qty: number;
                    range_max_qty: number | null;
                    unit_price_crc: number;
                    sort_order: number;
                    is_active: boolean;
                  } =>
                    range.range_min_qty != null &&
                    range.unit_price_crc != null &&
                    (range.range_max_qty == null || range.range_max_qty >= range.range_min_qty),
                ),
            )
          : undefined;

      const saveResult = await saveProduct({
        input: {
          product: payload,
          publication_mode: wantsNovaPublication ? "nova" : "internal",
          search_terms: searchableTerms,
          aliases: [],
          range_prices: normalizedRangePrices,
        },
      });
      const createdProduct = saveResult.product;

      setProducts((currentProducts) => {
        const withoutCurrent = currentProducts.filter((product) => product.id !== createdProduct.id);
        return [createdProduct, ...withoutCurrent];
      });
      setSelectedProductId(createdProduct.id);
      setCatalogTab("general");
      setIsCreateOpen(false);
      setCreateDraft(defaultCreateDraft);
      setCreateFeedbackItems([]);
      setCreateStatusMessage(
        saveResult.save_state === "saved_and_published_to_nova"
          ? "Guardado y listo para NOVA"
          : saveResult.save_state === "saved_internal_not_published"
            ? "Guardado interno no publicado"
            : "Guardado con fallo de refresh de indice",
      );
    } catch (error) {
      const novaValidation = extractNovaValidationFromError(error);
      if (novaValidation) {
        setCreateStatusMessage("No se pudo publicar en NOVA. Corrige los puntos marcados.");
        setCreateFeedbackItems(buildFeedbackFromNovaValidation(novaValidation));
        return;
      }

      const fallbackMessage =
        error instanceof Error ? error.message : "No se pudo crear el producto.";
      const friendlyMessage = toFriendlyOperationalMessage(fallbackMessage);
      const normalizedFallbackMessage = fallbackMessage.trim().toLowerCase();
      const isGenericInvalidParamsError =
        normalizedFallbackMessage.includes("invalid request parameters") ||
        normalizedFallbackMessage.includes("bad request");

      if (isGenericInvalidParamsError) {
        const actionableFeedback = createDraftOperationalFeedback.filter(
          (item) => item.severity !== "info",
        );

        if (actionableFeedback.length > 0) {
          setCreateStatusMessage("Hay datos por corregir antes de guardar/publicar.");
          setCreateFeedbackItems(actionableFeedback);
          return;
        }

        setCreateStatusMessage("Hay datos incompletos o inconsistentes en el formulario.");
        setCreateFeedbackItems([
          {
            severity: "error",
            message:
              "Revisa nombre, categoría, familia, modalidad de precio, cantidad mínima, resumen y términos de búsqueda.",
          },
        ]);
        return;
      }

      setCreateStatusMessage(friendlyMessage);
      setCreateFeedbackItems([{ severity: "error", message: friendlyMessage }]);
    }
  }

  function handleCreatePriceBlur(field: "price_crc" | "price_from_crc") {
    if (field === "price_crc") {
      setIsEditingCreatePriceCrc(false);
    } else {
      setIsEditingCreatePriceFromCrc(false);
    }

    setCreateDraft((current) => ({
      ...current,
      [field]: current[field].replace(/\.$/, ""),
    }));
  }

  function handleAddCreateRange() {
    const nextLocalId = `new-range-${Date.now()}-${Math.abs(tempIdSeed)}`;
    setTempIdSeed((current) => current - 1);
    setCreateDraft((current) => ({
      ...current,
      range_prices: [
        ...current.range_prices,
        {
          local_id: nextLocalId,
          range_min_qty: "",
          range_max_qty: "",
          unit_price_crc: "",
          is_open_ended: false,
          is_active: true,
        },
      ],
    }));
  }

  function handleUpdateCreateRange(
    localId: string,
    updates: Partial<CreateProductDraft["range_prices"][number]>,
  ) {
    setCreateDraft((current) => ({
      ...current,
      range_prices: current.range_prices.map((range) =>
        range.local_id === localId ? { ...range, ...updates } : range,
      ),
    }));
  }

  function handleDeleteCreateRange(localId: string) {
    setCreateDraft((current) => ({
      ...current,
      range_prices: current.range_prices.filter((range) => range.local_id !== localId),
    }));
  }

  function handleAddEditRange() {
    const nextTempId = tempIdSeed;
    setTempIdSeed((current) => current - 1);
    setEditDraft((current) =>
      current
        ? {
            ...current,
            range_prices: [
              ...current.range_prices,
              {
                id: nextTempId,
                product_id: current.id,
                range_min_qty: 1,
                range_max_qty: null,
                unit_price_crc: 1,
                sort_order: current.range_prices.length,
                is_active: true,
                created_at: new Date().toISOString(),
              },
            ],
          }
        : current,
    );
    setSaveStatusMessage(null);
    setSaveFeedbackItems([]);
  }

  function handleUpdateEditRange(
    rangeId: number,
    updates: Partial<ProductDetail["range_prices"][number]>,
  ) {
    setEditDraft((current) =>
      current
        ? {
            ...current,
            range_prices: current.range_prices.map((range) =>
              range.id === rangeId ? { ...range, ...updates } : range,
            ),
          }
        : current,
    );
    setSaveStatusMessage(null);
    setSaveFeedbackItems([]);
  }

  function handleDeleteEditRange(rangeId: number) {
    setEditDraft((current) =>
      current
        ? {
            ...current,
            range_prices: current.range_prices.filter((range) => range.id !== rangeId),
          }
        : current,
    );
    setSaveStatusMessage(null);
    setSaveFeedbackItems([]);
  }

  async function handleSaveChanges() {
    if (!selectedProductId || !editDraft || !editBaseline || !selectedProductEditablePayload) {
      return;
    }

    if (editNovaContractError) {
      setSaveStatusMessage(editNovaContractError);
      setSaveFeedbackItems(
        editNovaOperationalAssessment
          ? buildFeedbackFromNovaValidation({
              blockingIssues: editNovaOperationalAssessment.blockingIssues,
              warnings: editNovaOperationalAssessment.warnings,
              activeDiscoveryTerms: editNovaOperationalAssessment.activeDiscoveryTerms,
            })
          : [{ severity: "error", message: editNovaContractError }],
      );
      return;
    }

    if (localValidationError) {
      const friendlyMessage = toFriendlyOperationalMessage(localValidationError);
      setSaveStatusMessage(friendlyMessage);
      setSaveFeedbackItems([{ severity: "error", message: friendlyMessage }]);
      return;
    }

    setSaveFeedbackItems([]);
    setSaveStatusMessage("Guardando...");

    try {
      const publicationMode = editDraft.is_agent_visible ? "nova" : "internal";
      const corePayload = buildSaveProductPayloadFromDetail(editDraft);

      const normalizedAliases = editDraft.search_meta.alias_entries
        .map((entry) => entry.alias.trim())
        .filter(Boolean)
        .map((alias) => ({ alias }));

      const normalizedSearchTerms = editDraft.search_meta.search_terms
        .map((term) => ({
          id: term.id > 0 ? term.id : null,
          term: term.term.trim(),
          term_type: "alias" as const,
          priority: term.priority,
          is_active: term.is_active,
          notes: term.notes ?? null,
        }))
        .filter((term) => term.term.length > 0);

      const normalizedRangePrices =
        editDraft.pricing_mode === "range"
          ? sortRangePriceRows(
              editDraft.range_prices.map((range) => ({
                id: range.id > 0 ? range.id : null,
                range_min_qty: range.range_min_qty,
                range_max_qty: range.range_max_qty,
                unit_price_crc: range.unit_price_crc,
                sort_order: range.sort_order,
                is_active: range.is_active,
              })),
            )
          : undefined;

      const saveResult = await saveProduct({
        input: {
          product_id: selectedProductId,
          product: corePayload,
          publication_mode: publicationMode,
          aliases: normalizedAliases,
          search_terms: normalizedSearchTerms,
          range_prices: normalizedRangePrices,
        },
      });
      const updatedProduct = saveResult.product;

      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === updatedProduct.id ? updatedProduct : product,
        ),
      );
      setSaveStatusMessage(
        saveResult.save_state === "saved_and_published_to_nova"
          ? "Guardado y listo para NOVA"
          : saveResult.save_state === "saved_internal_not_published"
            ? "Guardado interno no publicado"
            : "Guardado con fallo de refresh de indice",
      );
      setSaveFeedbackItems([]);
      resetEditModalState();
    } catch (error) {
      const novaValidation = extractNovaValidationFromError(error);
      if (novaValidation) {
        setSaveStatusMessage("No se pudo publicar en NOVA. Corrige los puntos marcados.");
        setSaveFeedbackItems(buildFeedbackFromNovaValidation(novaValidation));
        return;
      }

      const fallbackMessage =
        error instanceof Error ? error.message : "No se pudieron guardar los cambios.";
      const friendlyMessage = toFriendlyOperationalMessage(fallbackMessage);
      setSaveStatusMessage(friendlyMessage);
      setSaveFeedbackItems([{ severity: "error", message: friendlyMessage }]);
    }
  }

  async function handleAddAlias() {
    if (!editDraft || !newAlias.trim()) {
      return;
    }

    const nextAlias = newAlias.trim();
    const alreadyExists = editDraft.search_meta.alias_entries.some(
      (entry) => entry.alias.trim().toLowerCase() === nextAlias.toLowerCase(),
    );

    if (alreadyExists) {
      setSearchMetaMessage("Alias repetido en el draft.");
      return;
    }

    const nextTempId = tempIdSeed;
    setTempIdSeed((current) => current - 1);
    setEditDraft((current) =>
      current
        ? {
            ...current,
            search_meta: {
              ...current.search_meta,
              alias_entries: [
                ...current.search_meta.alias_entries,
                { id: nextTempId, product_id: current.id, alias: nextAlias },
              ],
              aliases: [...current.search_meta.aliases, nextAlias],
            },
          }
        : current,
    );
    setNewAlias("");
    setSearchMetaMessage("Alias agregado al draft");
  }

  async function handleDeleteAlias(aliasId: number) {
    if (!editDraft) {
      return;
    }

    setEditDraft((current) =>
      current
        ? {
            ...current,
            search_meta: {
              ...current.search_meta,
              alias_entries: current.search_meta.alias_entries.filter((entry) => entry.id !== aliasId),
              aliases: current.search_meta.alias_entries
                .filter((entry) => entry.id !== aliasId)
                .map((entry) => entry.alias),
            },
          }
        : current,
    );
    setSearchMetaMessage("Alias eliminado del draft");
  }

  async function handleAddSearchTerm() {
    if (!editDraft || !newSearchTermDraft.term.trim()) {
      return;
    }
    if (!isSearchTermUsefulForNova(newSearchTermDraft.term)) {
      setSearchMetaMessage(NOVA_SEARCH_TERM_QUALITY_RULE_ES);
      return;
    }

    const nextTempId = tempIdSeed;
    setTempIdSeed((current) => current - 1);

    setEditDraft((current) =>
      current
        ? {
            ...current,
            search_meta: {
              ...current.search_meta,
              search_terms: [
                ...current.search_meta.search_terms,
                {
                  id: nextTempId,
                  product_id: current.id,
                  family: current.family,
                  category: current.category,
                  term: newSearchTermDraft.term.trim(),
                  term_type: "alias",
                  priority: toNumberOrNull(newSearchTermDraft.priority) ?? 100,
                  is_active: newSearchTermDraft.is_active,
                  notes: newSearchTermDraft.notes.trim() || null,
                  created_at: new Date().toISOString(),
                },
              ],
            },
          }
        : current,
    );
    setNewSearchTermDraft((current) => ({
      ...current,
      term: "",
      notes: "",
    }));
    setSearchMetaMessage("Search term agregado al draft");
  }

  async function handleUpdateSearchTerm(
    termId: number,
    updates: {
      term?: string;
      priority?: number;
      is_active?: boolean;
      notes?: string | null;
    },
  ) {
    if (!editDraft) {
      return;
    }

    setEditDraft((current) =>
      current
        ? {
            ...current,
            search_meta: {
              ...current.search_meta,
              search_terms: current.search_meta.search_terms.map((term) =>
                term.id === termId ? { ...term, ...updates } : term,
              ),
            },
          }
        : current,
    );
    setSearchMetaMessage("Search term actualizado en draft");
  }

  async function handleDeleteSearchTerm(termId: number) {
    if (!editDraft) {
      return;
    }

    setEditDraft((current) =>
      current
        ? {
            ...current,
            search_meta: {
              ...current.search_meta,
              search_terms: current.search_meta.search_terms.filter((term) => term.id !== termId),
            },
          }
        : current,
    );
    setSearchMetaMessage("Search term eliminado del draft");
  }

  async function handleAddImage() {
    if (!editDraft || !newImageDraft.file) {
      return;
    }

    try {
      const formData = new FormData();
      formData.set("file", newImageDraft.file);
      formData.set("alt_text", newImageDraft.alt_text.trim());
      formData.set("mark_as_primary", newImageDraft.mark_as_primary ? "true" : "false");

      const updatedProduct = await addProductImageMutation(editDraft.id, formData);
      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === updatedProduct.id ? updatedProduct : product,
        ),
      );
      setEditDraft(updatedProduct);
      setEditBaseline(updatedProduct);
      setSearchMetaMessage("Imagen cargada correctamente.");
      if (newImageDraft.preview_url) {
        URL.revokeObjectURL(newImageDraft.preview_url);
      }
      setNewImageDraft({
        file: null,
        preview_url: null,
        alt_text: "",
        mark_as_primary: false,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo cargar la imagen del producto.";
      setSearchMetaMessage(toFriendlyOperationalMessage(message));
    }
  }

  async function handleUpdateImageAlt(imageId: number, altText: string) {
    if (!editDraft) {
      return;
    }

    try {
      const updatedProduct = await updateProductImageMutation(editDraft.id, imageId, {
        alt_text: altText || null,
      });

      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === updatedProduct.id ? updatedProduct : product,
        ),
      );
      setEditDraft(updatedProduct);
      setEditBaseline(updatedProduct);
      setSearchMetaMessage("Texto alternativo actualizado.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar el texto alternativo.";
      setSearchMetaMessage(toFriendlyOperationalMessage(message));
    }
  }

  async function handleDeleteImage(imageId: number) {
    if (!editDraft) {
      return;
    }

    try {
      const updatedProduct = await deleteProductImageMutation(editDraft.id, imageId);
      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === updatedProduct.id ? updatedProduct : product,
        ),
      );
      setEditDraft(updatedProduct);
      setEditBaseline(updatedProduct);
      setSearchMetaMessage("Imagen eliminada.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar la imagen.";
      setSearchMetaMessage(toFriendlyOperationalMessage(message));
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-6 rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <PageHeader
            title="Productos"
            description="Catálogo conectado a datos reales para lectura operativa y control de integridad."
          />
          <div className="flex w-full flex-col gap-3 md:w-auto">
            <Button
              type="button"
              className="gap-2"
              onClick={() => {
                setCreateStatusMessage(null);
                setCreateFeedbackItems([]);
                setIsCreateOpen(true);
              }}
            >
              Nuevo Producto
            </Button>
            <Button type="button" asChild variant="outline" className="gap-2">
              <Link href="/products/promotions">Crear Promoción</Link>
            </Button>
            <Button type="button" asChild variant="outline" className="gap-2">
              <Link href="/products/promotions">Ver Promociones</Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-border/70 pt-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex rounded-2xl border border-border bg-white p-1">
              <button
                type="button"
                onClick={() => requestSetCurrentMode("catalog")}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  currentMode === "catalog"
                    ? "bg-slate-950 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                Catálogo
              </button>
              <button
                type="button"
                onClick={() => requestSetCurrentMode("performance")}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  currentMode === "performance"
                    ? "bg-slate-950 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                Performance
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <select
                value={filters.category}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, category: event.target.value }))
                }
                className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
              >
                <option value="all">Categoría: todas</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select
                value={filters.family}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, family: event.target.value }))
                }
                className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
              >
                <option value="all">Familia: todas</option>
                {familyOptions.map((family) => (
                  <option key={family} value={family}>
                    {family}
                  </option>
                ))}
              </select>

              <select
                value={filters.estado}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    estado: event.target.value as GlobalFilters["estado"],
                  }))
                }
                className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
              >
                <option value="all">Estado: todos</option>
                <option value="active">Solo activos</option>
                <option value="inactive">Solo inactivos</option>
              </select>

              <select
                value={filters.agente}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    agente: event.target.value as GlobalFilters["agente"],
                  }))
                }
                className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
              >
                <option value="all">Agente: todos</option>
                <option value="visible">Solo visibles</option>
                <option value="hidden">Solo no visibles</option>
              </select>

              <select
                value={filters.pricing_mode}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    pricing_mode: event.target.value as GlobalFilters["pricing_mode"],
                  }))
                }
                className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
              >
                <option value="all">Precio: todos</option>
                <option value="fixed">{getFriendlyPricingModeLabel("fixed")}</option>
                <option value="range">{getFriendlyPricingModeLabel("range")}</option>
                <option value="variable">{getFriendlyPricingModeLabel("variable")}</option>
              </select>

              <select
                value={filters.more_filter}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    more_filter: event.target.value as GlobalFilters["more_filter"],
                  }))
                }
                className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
              >
                <option value="none">Más filtros</option>
                <option value="integrity_alerts">Solo alertas de integridad</option>
                <option value="high_boost">Solo alta prioridad de búsqueda</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <button
                type="button"
                onClick={() => setShowAdvancedSearch((current) => !current)}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 transition hover:bg-slate-50"
              >
                Filtros de búsqueda avanzada
                {showAdvancedSearch ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              <label className="relative w-full lg:max-w-[460px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar por ID, SKU, nombre, familia, categoría o alias"
                  className="h-11 w-full rounded-2xl border border-border bg-white pl-11 pr-4 text-sm text-slate-950 outline-none transition focus:border-primary"
                />
              </label>
            </div>

            {showAdvancedSearch ? (
              <div className="mt-3 grid gap-3 rounded-2xl border border-border/70 bg-slate-50/70 p-4 sm:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Categoría
                  </span>
                  <select
                    value={filters.category}
                    onChange={(event) =>
                      setFilters((current) => ({ ...current, category: event.target.value }))
                    }
                    className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                  >
                    <option value="all">Todas</option>
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {getFriendlyFieldLabel("max_price_crc")}
                  </span>
                  <input
                    value={filters.max_price_crc}
                    onChange={(event) =>
                      setFilters((current) => ({ ...current, max_price_crc: event.target.value }))
                    }
                    inputMode="numeric"
                    placeholder="Ej: 3000"
                    className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {getFriendlyFieldLabel("min_qty")}
                  </span>
                  <input
                    value={filters.min_qty}
                    onChange={(event) =>
                      setFilters((current) => ({ ...current, min_qty: event.target.value }))
                    }
                    inputMode="numeric"
                    placeholder="Ej: 5"
                    className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {getFriendlyFieldLabel("exact_product_id")}
                  </span>
                  <input
                    value={filters.exact_product_id}
                    onChange={(event) =>
                      setFilters((current) => ({ ...current, exact_product_id: event.target.value }))
                    }
                    placeholder="Ej: SKU exacto del producto"
                    className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                  />
                </label>

                <div className="sm:col-span-2 xl:col-span-4">
                  <p className="text-xs leading-5 text-muted-foreground">
                    Los filtros se aplican sobre el catálogo real para mostrar resultados actualizados.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {isCatalogError ? (
        <StateDisplay
          compact
          tone="error"
          title="No se pudo cargar el catalogo real"
          description={catalogError?.message ?? "Error inesperado consultando productos."}
        />
      ) : null}
      {currentMode === "performance" && isPerformanceError ? (
        <StateDisplay
          compact
          tone="error"
          title="No se pudo cargar performance"
          description={performanceError?.message ?? "Error inesperado consultando metricas reales."}
        />
      ) : null}

      {currentMode === "catalog" ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[24px] border border-white/70 bg-white/90 p-5 text-center shadow-[0_30px_56px_-26px_rgba(2,6,23,0.24),0_12px_26px_-14px_rgba(2,6,23,0.17)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Productos activos
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{catalogKpis.activeProducts}</p>
          </article>
          <article className="rounded-[24px] border border-white/70 bg-white/90 p-5 text-center shadow-[0_30px_56px_-26px_rgba(2,6,23,0.24),0_12px_26px_-14px_rgba(2,6,23,0.17)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Visibles al agente
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{catalogKpis.agentVisibleProducts}</p>
          </article>
          <article className="rounded-[24px] border border-amber-200/80 bg-amber-50/80 p-5 text-center shadow-[0_30px_56px_-26px_rgba(2,6,23,0.24),0_12px_26px_-14px_rgba(2,6,23,0.17)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
              Con alertas de integridad
            </p>
            <p className="mt-2 text-3xl font-semibold text-amber-900">{catalogKpis.withAlerts}</p>
          </article>
          <article className="rounded-[24px] border border-rose-200/80 bg-rose-50/80 p-5 text-center shadow-[0_30px_56px_-26px_rgba(2,6,23,0.24),0_12px_26px_-14px_rgba(2,6,23,0.17)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
              Sin imagen principal
            </p>
            <p className="mt-2 text-3xl font-semibold text-rose-800">{catalogKpis.withoutPrimaryImage}</p>
          </article>
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-[0_30px_56px_-26px_rgba(2,6,23,0.24),0_12px_26px_-14px_rgba(2,6,23,0.17)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Unidades vendidas
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {(performanceData?.summary.units_sold_total ?? 0).toLocaleString("es-CR")}
            </p>
          </article>
          <article className="rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-[0_30px_56px_-26px_rgba(2,6,23,0.24),0_12px_26px_-14px_rgba(2,6,23,0.17)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Ingresos
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {formatCurrencyCRC(performanceData?.summary.revenue_total_crc ?? 0)}
            </p>
          </article>
          <article className="rounded-[24px] border border-amber-200/80 bg-amber-50/80 p-5 shadow-[0_30px_56px_-26px_rgba(2,6,23,0.24),0_12px_26px_-14px_rgba(2,6,23,0.17)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
              Productos sin ventas
            </p>
            <p className="mt-2 text-3xl font-semibold text-amber-900">
              {performanceData?.summary.products_without_sales ?? 0}
            </p>
          </article>
          <article className="rounded-[24px] border border-rose-200/80 bg-rose-50/80 p-5 shadow-[0_30px_56px_-26px_rgba(2,6,23,0.24),0_12px_26px_-14px_rgba(2,6,23,0.17)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
              Alertas comerciales
            </p>
            <p className="mt-2 text-3xl font-semibold text-rose-800">
              {performanceData?.summary.products_with_commercial_alerts ?? 0}
            </p>
          </article>
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,0.85fr)] xl:items-stretch">
        <div className={`space-y-6 ${currentMode === "catalog" ? "xl:h-full" : ""}`}>
          {currentMode === "catalog" ? (
            <section className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)] xl:flex xl:h-full xl:flex-col">
              <div className="overflow-x-auto xl:flex-1">
                <table className="min-w-full divide-y divide-border/70 text-left">
                  <thead>
                    <tr className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      <th className="px-3 py-3">Producto</th>
                      <th className="px-3 py-3">SKU</th>
                      <th className="px-3 py-3">Categoría / Familia</th>
                      <th className="px-3 py-3">Precio</th>
                      <th className="px-3 py-3">Estado</th>
                      <th className="px-3 py-3">Agente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isCatalogLoading ? (
                      <TableEmptyStateRow
                        colSpan={6}
                        title="Cargando catalogo"
                        description="Preparando productos para mostrar en pantalla."
                        isLoading
                      />
                    ) : null}
                    {catalogRows.map((row) => {
                      const isSelected = row.id === selectedProductId;
                      const thumbnailSrc = resolveStorageImageUrl(row.primary_image_signed_url);
                      const thumbnailKey = `${row.id}:${thumbnailSrc ?? "none"}`;
                      const hasThumbnailError = Boolean(thumbnailLoadErrors[thumbnailKey]);

                      return (
                        <tr
                          key={row.id}
                          className={`cursor-pointer text-sm text-slate-700 transition first:border-t-0 hover:bg-slate-50 ${
                            isSelected
                              ? "drop-shadow-[0_12px_22px_rgba(15,23,42,0.12)] [&>td]:bg-slate-200/75 [&>td:first-child]:rounded-l-[18px] [&>td:last-child]:rounded-r-[18px]"
                              : "border-t border-border/60"
                          }`}
                          onClick={() => requestSelectProduct(row.id)}
                        >
                          <td className="px-3 py-4 align-top">
                            <div className="flex items-start gap-3">
                              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-slate-100 text-muted-foreground">
                                {thumbnailSrc && !hasThumbnailError ? (
                                  <Image
                                    src={thumbnailSrc}
                                    alt={row.primary_image_alt ?? `Thumbnail ${row.name}`}
                                    fill
                                    sizes="44px"
                                    className="object-cover"
                                    onError={() =>
                                      setThumbnailLoadErrors((current) => ({
                                        ...current,
                                        [thumbnailKey]: true,
                                      }))
                                    }
                                  />
                                ) : row.primary_image_path ? (
                                  <ImageIcon className="h-4 w-4" />
                                ) : (
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">
                                    N/A
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1">
                                <p className="font-medium text-slate-950">{row.name}</p>
                                {(row.variant_label || row.size_label) && (
                                  <p className="text-xs text-muted-foreground">
                                    {[row.variant_label, row.size_label].filter(Boolean).join(" / ")}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 align-top font-medium text-slate-950">{row.sku}</td>
                          <td className="px-3 py-4 align-top">
                            <p>{row.category}</p>
                            <p className="text-xs text-muted-foreground">{row.family}</p>
                          </td>
                          <td className="px-3 py-4 align-top">
                            <p className="font-medium text-slate-950">{getFormattedPrice(row)}</p>
                            <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                              {getPriceModeLabel(row.pricing_mode)}
                            </p>
                          </td>
                          <td className="px-3 py-4 align-top">
                            <StatusBadge tone={row.is_active ? "success" : "danger"}>
                              {row.is_active ? "Activo" : "Inactivo"}
                            </StatusBadge>
                          </td>
                          <td className="px-3 py-4 align-top">
                            <StatusBadge tone={row.is_agent_visible ? "info" : "warning"}>
                              {row.is_agent_visible ? "Visible" : "Oculto"}
                            </StatusBadge>
                          </td>
                        </tr>
                      );
                    })}
                    {!isCatalogLoading && catalogRows.length === 0 ? (
                      <TableEmptyStateRow
                        colSpan={6}
                        title="No hay productos para este filtro"
                        description="Ajusta búsqueda, categoría, cantidad mínima o identificador exacto para ver resultados."
                      />
                    ) : null}
                  </tbody>
                </table>
              </div>
              {!isCatalogLoading && filteredProducts.length > 0 ? (
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 px-1 pt-4 xl:mt-auto">
                  <p className="text-xs font-medium text-muted-foreground">
                    Pagina {Math.min(currentPage, totalPages)} de {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      className="h-8 rounded-full px-3"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      className="h-8 rounded-full px-3"
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </section>
          ) : (
            <section className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border/70 text-left">
                  <thead>
                    <tr className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      <th className="px-3 py-3">Producto</th>
                      <th className="px-3 py-3">SKU</th>
                      <th className="px-3 py-3">Unidades vendidas</th>
                      <th className="px-3 py-3">Ingresos</th>
                      <th className="px-3 py-3">Margen</th>
                      <th className="px-3 py-3">Stock</th>
                      <th className="px-3 py-3">Ultima actualizacion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isPerformanceLoading ? (
                      <TableEmptyStateRow
                        colSpan={7}
                        title="Cargando performance real"
                        description="Agregando ventas validas por product_id..."
                      />
                    ) : null}
                    {performanceRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`cursor-pointer text-sm text-slate-700 transition first:border-t-0 hover:bg-slate-50 ${
                          row.id === selectedProductId
                            ? "drop-shadow-[0_12px_22px_rgba(15,23,42,0.12)] [&>td]:bg-slate-200/75 [&>td:first-child]:rounded-l-[18px] [&>td:last-child]:rounded-r-[18px]"
                            : "border-t border-border/60"
                        }`}
                        onClick={() => requestSelectProduct(row.id)}
                      >
                        <td className="px-3 py-4">
                          <p className="font-medium text-slate-950">{row.name}</p>
                          {(row.variant_label || row.size_label) && (
                            <p className="text-xs text-muted-foreground">
                              {[row.variant_label, row.size_label].filter(Boolean).join(" / ")}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-4 font-medium text-slate-950">{row.sku}</td>
                        <td className="px-3 py-4">{row.units_sold.toLocaleString("es-CR")}</td>
                        <td className="px-3 py-4">{formatCurrencyCRC(row.revenue_crc)}</td>
                        <td className="px-3 py-4">
                          {row.margin_percent == null ? (
                            <span className="text-xs text-muted-foreground">N/D</span>
                          ) : (
                            <div className="inline-flex items-center gap-2">
                              <CircleDot
                                className={`h-3.5 w-3.5 ${
                                  row.margin_percent >= 35
                                    ? "text-emerald-600"
                                    : row.margin_percent >= 20
                                      ? "text-amber-500"
                                      : "text-rose-500"
                                }`}
                              />
                              <span>{row.margin_percent}%</span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-4">
                          {row.stock == null ? (
                            <span className="text-xs text-muted-foreground">N/D</span>
                          ) : (
                            <span>{row.stock}</span>
                          )}
                        </td>
                        <td className="px-3 py-4">{formatDateTime(row.updated_at)}</td>
                      </tr>
                    ))}
                    {!isPerformanceLoading && performanceRows.length === 0 ? (
                      <TableEmptyStateRow
                        colSpan={7}
                        title="No hay datos para performance"
                        description="No hay ventas validas o productos visibles para los filtros actuales."
                      />
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        <aside className={`min-w-0 space-y-6 ${currentMode === "catalog" ? "xl:h-full" : ""}`}>
          {currentMode === "catalog" ? (
            <>
              <section className="min-w-0 rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)] xl:h-full">
                {!selectedProductId ? (
                  <StateDisplay
                    compact
                    title="Selecciona un producto"
                    description="El panel contextual muestra detalle catalogo por producto."
                  />
                ) : isSelectedProductLoading && !selectedProductBase ? (
                  <StateDisplay
                    compact
                    title="Cargando detalle"
                    description="Consultando producto seleccionado..."
                  />
                ) : isSelectedProductError ? (
                  <StateDisplay
                    compact
                    tone="error"
                    title="No se pudo cargar el detalle"
                    description="Intenta seleccionar de nuevo el producto."
                  />
                ) : !selectedProductBase ? (
                  <StateDisplay
                    compact
                    title="Producto no disponible"
                    description="El producto no fue encontrado en la consulta actual."
                  />
                ) : (
                  <div className="min-w-0 space-y-5">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/70">
                        Detalle del producto
                      </p>
                      <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                        {selectedProductBase.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">{selectedProductBase.id}</p>
                      {selectedProductBase.ui_created_locally ? (
                        <StatusBadge tone="warning" className="mt-2">
                          Borrador local
                        </StatusBadge>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-border/70 bg-slate-50/70 p-3">
                        <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">SKU</p>
                        <p className="mt-1 text-sm font-medium text-slate-950">{selectedProductBase.sku}</p>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-slate-50/70 p-3">
                        <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Categoría / Familia</p>
                        <p className="mt-1 text-sm font-medium text-slate-950">
                          {selectedProductBase.category} / {selectedProductBase.family}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-slate-50/70 p-3">
                        <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Precio</p>
                        <p className="mt-1 text-sm font-medium text-slate-950">
                          {getFormattedPrice(selectedProductBase)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-slate-50/70 p-3">
                        <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Estado</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <StatusBadge tone={selectedProductBase.is_active ? "success" : "danger"}>
                            {selectedProductBase.is_active ? "Activo" : "Inactivo"}
                          </StatusBadge>
                          <StatusBadge tone={selectedProductBase.is_agent_visible ? "info" : "warning"}>
                            {selectedProductBase.is_agent_visible ? "Visible agente" : "Oculto agente"}
                          </StatusBadge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-2xl border border-border/70 bg-slate-50/70 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Resumen operativo
                      </p>
                      <p className="text-sm text-slate-900">{selectedProductBase.summary ?? "Sin resumen."}</p>
                      <p className="text-sm text-slate-700">{selectedProductBase.details ?? "Sin detalle."}</p>
                      <p className="text-xs text-muted-foreground">{selectedProductBase.notes ?? "Sin notas."}</p>
                    </div>

                    <div className="space-y-2 rounded-2xl border border-border/70 bg-slate-50/70 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Búsqueda y multimedia
                      </p>
                      <p className="text-sm text-slate-800">
                        Alias: {selectedProductBase.search_meta.alias_entries.length}
                      </p>
                      <p className="text-sm text-slate-800">
                        Términos de búsqueda: {selectedProductBase.search_meta.search_terms.length}
                      </p>
                      <p className="text-sm text-slate-800">Imágenes: {selectedProductBase.images.length}</p>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-slate-50/70 p-3">
                      <p className="text-xs text-muted-foreground">
                        Vista solo lectura. Edita desde modal para aplicar cambios de forma controlada.
                      </p>
                      <Button type="button" onClick={openEditModal}>
                        Editar Producto
                      </Button>
                    </div>

                    {isEditOpen && selectedProduct ? (
                      <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-[2px]"
                        onMouseDown={onEditBackdropMouseDown}
                      >
                        <section
                          className="flex h-[82vh] w-full max-w-5xl flex-col rounded-[30px] border border-white/80 bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.18)] sm:p-6"
                          onMouseDown={(event) => event.stopPropagation()}
                        >
                          <div className="border-b border-border/70 pb-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="space-y-1">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/70">
                                  Editar producto
                                </p>
                                <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                                  {selectedProduct?.name}
                                </h3>
                                <p className="text-xs text-muted-foreground">{selectedProduct?.id}</p>
                                <p className="text-xs text-muted-foreground">SKU: {selectedProduct?.sku}</p>
                                <button
                                  type="button"
                                  onClick={() => setShowEditHelpPopup(true)}
                                  className="text-xs font-semibold text-sky-700 transition hover:text-sky-800"
                                >
                                  ¿Necesitas ayuda? Ver guía de edición
                                </button>
                              </div>
                              <div className="flex items-start gap-3">
                                {editNovaOperationalAssessment ? (
                                  <StatusBadge tone={editNovaOperationalAssessment.statusTone}>
                                    {editNovaOperationalAssessment.statusLabel}
                                  </StatusBadge>
                                ) : null}
                                {selectedPrimaryImageSrc ? (
                                  <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-border/70 bg-slate-100">
                                    {!thumbnailLoadErrors[`edit-header:${selectedProduct.id}:${selectedPrimaryImageSrc}`] ? (
                                      <Image
                                        src={selectedPrimaryImageSrc}
                                        alt={selectedPrimaryImage.alt_text ?? `Imagen ${selectedProduct.name}`}
                                        fill
                                        sizes="80px"
                                        className="object-cover"
                                        onError={() =>
                                          setThumbnailLoadErrors((current) => ({
                                            ...current,
                                            [`edit-header:${selectedProduct.id}:${selectedPrimaryImageSrc}`]: true,
                                          }))
                                        }
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                        <ImageIcon className="h-5 w-5" />
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            <div className="mt-3 flex flex-col gap-2 rounded-xl border border-border/70 bg-slate-50/80 p-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="space-y-2">
                                {editNovaOperationalAssessment ? (
                                  <p className="text-xs text-muted-foreground">
                                    Search terms activos: {editNovaOperationalAssessment.activeDiscoveryTerms}
                                  </p>
                                ) : null}
                                <p className="text-xs text-muted-foreground">
                                  {editNovaContractError ??
                                    (localValidationError
                                      ? toFriendlyOperationalMessage(localValidationError)
                                      : null) ??
                                    saveStatusMessage ??
                                    "Cambios locales. Nada se guarda hasta presionar Guardar cambios."}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button type="button" variant="outline" onClick={requestCloseEditModal}>
                                  Cancelar
                                </Button>
                                <Button
                                  type="button"
                                  onClick={handleSaveChanges}
                                  disabled={
                                    !hasPendingChanges ||
                                    Boolean(localValidationError) ||
                                    Boolean(editNovaContractError) ||
                                    isSavingProduct
                                  }
                                >
                                  {isSavingProduct ? "Guardando..." : "Guardar cambios"}
                                </Button>
                              </div>
                            </div>
                            <FeedbackList items={editOperationalFeedback} className="mt-3" />
                            <FeedbackList items={saveFeedbackItems} className="mt-2" />
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {catalogTabs.map((tab) => (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setCatalogTab(tab.id)}
                                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] transition ${
                                  catalogTab === tab.id
                                    ? "border-slate-950 bg-slate-950 text-white"
                                    : "border-border bg-white text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>

                          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                          {catalogTab === "general" ? (
                            <fieldset className="space-y-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary/70">
                                Identidad del producto
                              </p>
                              <label className="space-y-1">
                                  <span className="text-xs text-muted-foreground">Nombre</span>
                                <input
                                  value={selectedProduct?.name ?? ""}
                                  onChange={(event) =>
                                    updateSelectedProductField("name", event.target.value)
                                  }
                                  className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                                />
                              </label>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <SuggestionInput
                                  label="Categoría"
                                  value={selectedProduct?.category ?? ""}
                                  options={categoryOptions}
                                  createOptionLabel="Crear categoría"
                                  onChange={(nextValue) =>
                                    updateSelectedProductField("category", nextValue)
                                  }
                                />
                                <SuggestionInput
                                  label="Familia"
                                  value={selectedProduct?.family ?? ""}
                                  options={familyOptions}
                                  createOptionLabel="Crear familia"
                                  onChange={(nextValue) =>
                                    updateSelectedProductField("family", nextValue)
                                  }
                                />
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <SuggestionInput
                                  label={getFriendlyFieldLabel("variant_label")}
                                  value={selectedProduct?.variant_label ?? ""}
                                  options={variantOptions}
                                  createOptionLabel="Crear variante"
                                  onChange={(nextValue) =>
                                    updateSelectedProductField(
                                      "variant_label",
                                      nextValue.trim() ? nextValue : null,
                                    )
                                  }
                                />
                                <SuggestionInput
                                  label={getFriendlyFieldLabel("size_label")}
                                  value={selectedProduct?.size_label ?? ""}
                                  options={sizeOptions}
                                  createOptionLabel="Crear tamaño"
                                  onChange={(nextValue) =>
                                    updateSelectedProductField(
                                      "size_label",
                                      nextValue.trim() ? nextValue : null,
                                    )
                                  }
                                />
                                <SuggestionInput
                                  label="Material"
                                  value={selectedProduct?.material ?? ""}
                                  options={materialOptions}
                                  createOptionLabel="Crear material"
                                  onChange={(nextValue) =>
                                    updateSelectedProductField(
                                      "material",
                                      nextValue.trim() ? nextValue : null,
                                    )
                                  }
                                />
                                <label className="space-y-1">
                                  <span className="text-xs text-muted-foreground">{getFriendlyFieldLabel("base_color")}</span>
                                  <input
                                    value={selectedProduct?.base_color ?? ""}
                                    onChange={(event) =>
                                      updateSelectedProductField("base_color", event.target.value || null)
                                    }
                                    className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                                  />
                                </label>
                              </div>
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary/70">
                                Contenido para NOVA
                              </p>
                              <label className="space-y-1">
                                <span className="text-xs text-muted-foreground">Resumen</span>
                                <textarea
                                  value={selectedProduct?.summary ?? ""}
                                  onChange={(event) =>
                                    updateSelectedProductField("summary", event.target.value || null)
                                  }
                                  rows={2}
                                  className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-primary"
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs text-muted-foreground">Detalle</span>
                                <textarea
                                  value={selectedProduct?.details ?? ""}
                                  onChange={(event) =>
                                    updateSelectedProductField("details", event.target.value || null)
                                  }
                                  rows={2}
                                  className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-primary"
                                />
                              </label>
                              <div className="space-y-2 rounded-xl border border-border/70 bg-slate-50/70 p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                    Términos de búsqueda para NOVA
                                  </p>
                                  <StatusBadge tone="info">
                                    {getActiveDiscoveryTerms(selectedProduct).length} activos
                                  </StatusBadge>
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                  <input
                                    value={newSearchTermDraft.term}
                                    onChange={(event) =>
                                      setNewSearchTermDraft((current) => ({
                                        ...current,
                                        term: event.target.value,
                                      }))
                                    }
                                    placeholder="Agregar término de búsqueda"
                                    className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleAddSearchTerm}
                                    disabled={!newSearchTermDraft.term.trim() || isSavingProduct}
                                    className="w-full sm:w-auto sm:shrink-0"
                                  >
                                    Agregar
                                  </Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {selectedProduct.search_meta.search_terms.length > 0 ? (
                                    selectedProduct.search_meta.search_terms.map((term) => (
                                      <button
                                        key={term.id}
                                        type="button"
                                        onClick={() => handleDeleteSearchTerm(term.id)}
                                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs transition ${
                                          term.is_active
                                            ? "border-slate-300 bg-white text-slate-800 hover:bg-rose-50 hover:text-rose-700"
                                            : "border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200"
                                        }`}
                                      >
                                        {term.term}
                                      </button>
                                    ))
                                  ) : (
                                    <p className="text-xs text-muted-foreground">
                                      Sin términos de búsqueda. Agrega al menos uno para mantener publicable en NOVA.
                                    </p>
                                  )}
                                </div>
                              </div>
                              <label className="space-y-1">
                                <span className="text-xs text-muted-foreground">Notas</span>
                                <textarea
                                  value={selectedProduct?.notes ?? ""}
                                  onChange={(event) =>
                                    updateSelectedProductField("notes", event.target.value || null)
                                  }
                                  rows={2}
                                  className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-primary"
                                />
                              </label>
                            </fieldset>
                          ) : null}

                          {catalogTab === "precios" ? (
                      <fieldset className="space-y-3">
                        <label className="space-y-1">
                          <span className="text-xs text-muted-foreground">{getFriendlyFieldLabel("pricing_mode")}</span>
                          <select
                            value={selectedProduct.pricing_mode}
                            onChange={(event) => {
                              const nextMode = event.target.value as ProductPricingMode;
                              setEditDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      pricing_mode: nextMode,
                                      price_crc:
                                        nextMode === "range" ? null : current.price_crc,
                                      price_from_crc:
                                        nextMode === "range"
                                          ? current.price_from_crc
                                          : null,
                                    }
                                  : current,
                              );
                              setSaveStatusMessage(null);
                              setSaveFeedbackItems([]);
                            }}
                            className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                          >
                            <option value="fixed">{getFriendlyPricingModeLabel("fixed")}</option>
                            <option value="range">{getFriendlyPricingModeLabel("range")}</option>
                            <option value="variable">{getFriendlyPricingModeLabel("variable")}</option>
                          </select>
                        </label>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {selectedProduct.pricing_mode === "fixed" ? (
                            <label className="space-y-1">
                              <span className="text-xs text-muted-foreground">
                                {getFriendlyFieldLabel("price_crc")}
                              </span>
                              <input
                                value={selectedProduct.price_crc ?? ""}
                                onChange={(event) =>
                                  updateSelectedProductField(
                                    "price_crc",
                                    toNumberOrNull(event.target.value),
                                  )
                                }
                                inputMode="numeric"
                                className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                              />
                            </label>
                          ) : null}
                          {selectedProduct.pricing_mode === "range" ? (
                            <label className="space-y-1">
                              <span className="text-xs text-muted-foreground">{getFriendlyFieldLabel("price_from_crc")}</span>
                              <input
                                value={selectedProduct.price_from_crc ?? ""}
                                onChange={(event) =>
                                  updateSelectedProductField(
                                    "price_from_crc",
                                    toNumberOrNull(event.target.value),
                                  )
                                }
                                inputMode="numeric"
                                className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                              />
                            </label>
                          ) : null}
                          {selectedProduct.pricing_mode === "variable" ? (
                            <>
                              <label className="space-y-1">
                                <span className="text-xs text-muted-foreground">Precio base interno</span>
                                <input
                                  value={selectedProduct.price_crc ?? ""}
                                  onChange={(event) =>
                                    updateSelectedProductField(
                                      "price_crc",
                                      toNumberOrNull(event.target.value),
                                    )
                                  }
                                  inputMode="numeric"
                                  className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                                />
                              </label>
                              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:col-span-2">
                                Este producto se cotiza con revisión manual. No usa precio por rangos.
                              </div>
                            </>
                          ) : null}
                          <label className="space-y-1">
                            <span className="text-xs text-muted-foreground">{getFriendlyFieldLabel("min_qty")}</span>
                            <input
                              value={selectedProduct.min_qty ?? ""}
                              onChange={(event) =>
                                updateSelectedProductField(
                                  "min_qty",
                                  toNumberOrNull(event.target.value),
                                )
                              }
                              inputMode="numeric"
                              className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs text-muted-foreground">{getFriendlyFieldLabel("discount_visibility")}</span>
                            <select
                              value={selectedProduct.discount_visibility}
                              onChange={(event) =>
                                updateSelectedProductField(
                                  "discount_visibility",
                                  event.target.value as ProductDetail["discount_visibility"],
                                )
                              }
                              disabled={!selectedProduct.is_discountable}
                              className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                            >
                              <option value="never">{getFriendlyDiscountVisibilityLabel("never")}</option>
                              <option value="only_if_customer_requests">
                                {getFriendlyDiscountVisibilityLabel("only_if_customer_requests")}
                              </option>
                              <option value="internal_only">{getFriendlyDiscountVisibilityLabel("internal_only")}</option>
                              <option value="always">{getFriendlyDiscountVisibilityLabel("always")}</option>
                            </select>
                          </label>
                        </div>
                        {selectedProduct.pricing_mode === "range" ? (
                          <div className="space-y-2 rounded-2xl border border-border/70 bg-slate-50/80 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                Rangos estructurales
                              </p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddEditRange}
                                disabled={isSavingProduct}
                              >
                                Agregar rango
                              </Button>
                            </div>
                            {sortRangePriceRows(selectedProduct.range_prices).length > 0 ? (
                              <div className="space-y-2">
                                {sortRangePriceRows(selectedProduct.range_prices).map((range, index) => (
                                  <div
                                    key={`range-edit-${range.id}`}
                                    className="grid gap-2 rounded-xl border border-border/60 bg-white p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto]"
                                  >
                                    <label className="space-y-1">
                                      <span className="text-[11px] text-muted-foreground">Desde qty</span>
                                      <input
                                        value={range.range_min_qty}
                                        inputMode="numeric"
                                        onChange={(event) =>
                                          handleUpdateEditRange(range.id, {
                                            range_min_qty:
                                              toNumberOrNull(event.target.value) ?? 0,
                                            sort_order: index,
                                          })
                                        }
                                        className="h-9 w-full rounded-lg border border-border bg-white px-2 text-xs text-slate-950 outline-none transition focus:border-primary"
                                      />
                                    </label>
                                    <label className="space-y-1">
                                      <span className="text-[11px] text-muted-foreground">Hasta qty</span>
                                      <input
                                        value={range.range_max_qty ?? ""}
                                        inputMode="numeric"
                                        disabled={range.range_max_qty == null}
                                        onChange={(event) =>
                                          handleUpdateEditRange(range.id, {
                                            range_max_qty:
                                              toNumberOrNull(event.target.value),
                                          })
                                        }
                                        className="h-9 w-full rounded-lg border border-border bg-white px-2 text-xs text-slate-950 outline-none transition focus:border-primary disabled:bg-slate-100 disabled:text-slate-500"
                                      />
                                    </label>
                                    <label className="space-y-1">
                                      <span className="text-[11px] text-muted-foreground">Precio unitario</span>
                                      <input
                                        value={range.unit_price_crc}
                                        inputMode="numeric"
                                        onChange={(event) =>
                                          handleUpdateEditRange(range.id, {
                                            unit_price_crc:
                                              toNumberOrNull(event.target.value) ?? 0,
                                          })
                                        }
                                        className="h-9 w-full rounded-lg border border-border bg-white px-2 text-xs text-slate-950 outline-none transition focus:border-primary"
                                      />
                                    </label>
                                    <label className="inline-flex items-center gap-1 text-xs text-slate-700">
                                      <input
                                        type="checkbox"
                                        checked={range.range_max_qty == null}
                                        onChange={(event) =>
                                          handleUpdateEditRange(range.id, {
                                            range_max_qty: event.target.checked
                                              ? null
                                              : range.range_min_qty,
                                          })
                                        }
                                      />
                                      Abierto
                                    </label>
                                    <div className="flex items-center justify-end gap-2">
                                      <label className="inline-flex items-center gap-1 text-xs text-slate-700">
                                        <input
                                          type="checkbox"
                                          checked={range.is_active}
                                          onChange={(event) =>
                                            handleUpdateEditRange(range.id, {
                                              is_active: event.target.checked,
                                            })
                                          }
                                        />
                                        Activo
                                      </label>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeleteEditRange(range.id)}
                                        disabled={isSavingProduct}
                                      >
                                        Eliminar
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Sin rangos cargados. Agrega al menos un tramo para guardar en modo rangos.
                              </p>
                            )}
                            <p className="text-[11px] text-muted-foreground">
                              El orden visual se aplica de menor a mayor por cantidad mínima.
                            </p>
                          </div>
                        ) : null}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="inline-flex items-center gap-2 text-sm text-slate-800">
                            <input
                              type="checkbox"
                              checked={selectedProduct.is_discountable}
                              onChange={(event) => {
                                setEditDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        is_discountable: event.target.checked,
                                        discount_visibility: event.target.checked
                                          ? current.discount_visibility
                                          : "never",
                                      }
                                    : current,
                                );
                                setSaveStatusMessage(null);
                                setSaveFeedbackItems([]);
                              }}
                            />
                            {getFriendlyFieldLabel("is_discountable")}
                          </label>
                          <label className="inline-flex items-center gap-2 text-sm text-slate-800">
                            <input
                              type="checkbox"
                              checked={selectedProduct.is_premium}
                              onChange={(event) =>
                                updateSelectedProductField("is_premium", event.target.checked)
                              }
                            />
                            Es premium
                          </label>
                          <label className="inline-flex items-center gap-2 text-sm text-slate-800">
                            <input
                              type="checkbox"
                              checked={selectedProduct.is_full_color}
                              onChange={(event) =>
                                updateSelectedProductField("is_full_color", event.target.checked)
                              }
                            />
                            Impresión a color completo
                          </label>
                        </div>
                      </fieldset>
                    ) : null}

                    {catalogTab === "busqueda" ? (
                      <fieldset className="min-w-0 space-y-3">
                        <div className="rounded-2xl border border-border/70 bg-slate-50/80 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Alias
                          </p>
                          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                            <input
                              value={newAlias}
                              onChange={(event) => setNewAlias(event.target.value)}
                              placeholder="Nuevo alias"
                              className="h-10 w-full min-w-0 rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleAddAlias}
                              disabled={!newAlias.trim() || isSavingProduct}
                              className="w-full sm:w-auto sm:shrink-0"
                            >
                              Agregar
                            </Button>
                          </div>
                          <div className="mt-2 space-y-2">
                            {selectedProduct.search_meta.alias_entries.length > 0 ? (
                              selectedProduct.search_meta.alias_entries.map((entry) => (
                                <div
                                  key={entry.id}
                                  className="flex min-w-0 flex-col gap-2 rounded-xl bg-white px-3 py-2 text-sm text-slate-800 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <span className="min-w-0 break-all">{entry.alias}</span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleDeleteAlias(entry.id)}
                                    disabled={isSavingProduct}
                                    className="w-full sm:w-auto sm:shrink-0"
                                  >
                                    Eliminar
                                  </Button>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">Sin alias registrados.</p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border/70 bg-slate-50/80 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            {getFriendlyFieldLabel("search_terms")}
                          </p>
                          <div className="mt-2 grid min-w-0 gap-2 sm:grid-cols-2">
                            <input
                              value={newSearchTermDraft.term}
                              onChange={(event) =>
                                setNewSearchTermDraft((current) => ({
                                  ...current,
                                  term: event.target.value,
                                }))
                              }
                              placeholder="Término"
                              className="h-10 w-full min-w-0 rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                            />
                            <input
                              value={newSearchTermDraft.priority}
                              onChange={(event) =>
                                setNewSearchTermDraft((current) => ({
                                  ...current,
                                  priority: event.target.value,
                                }))
                              }
                              placeholder="Prioridad"
                              inputMode="numeric"
                              className="h-10 w-full min-w-0 rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                            />
                            <input
                              value={newSearchTermDraft.notes}
                              onChange={(event) =>
                                setNewSearchTermDraft((current) => ({
                                  ...current,
                                  notes: event.target.value,
                                }))
                              }
                              placeholder="Notas (opcional)"
                              className="h-10 w-full min-w-0 rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleAddSearchTerm}
                              disabled={!newSearchTermDraft.term.trim() || isSavingProduct}
                              className="w-full sm:col-span-2"
                            >
                              Agregar
                            </Button>
                          </div>
                          <div className="mt-2 space-y-2 text-sm">
                            {selectedProduct.search_meta.search_terms.length > 0 ? (
                              selectedProduct.search_meta.search_terms.map((term) => (
                                <div key={term.id} className="rounded-xl bg-white px-3 py-2 text-slate-800">
                                  <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-center">
                                    <input
                                      defaultValue={term.term}
                                      onBlur={(event) => {
                                        const nextTerm = event.target.value.trim();
                                        if (nextTerm && nextTerm !== term.term) {
                                          void handleUpdateSearchTerm(term.id, { term: nextTerm });
                                        }
                                      }}
                                      className="h-9 w-full min-w-0 rounded-lg border border-border bg-white px-2 text-xs text-slate-950 outline-none transition focus:border-primary"
                                    />
                                    <span className="text-xs uppercase text-muted-foreground">
                                      {term.term_type}
                                    </span>
                                    <input
                                      defaultValue={String(term.priority)}
                                      onBlur={(event) => {
                                        const priority = toNumberOrNull(event.target.value);
                                        if (priority != null && priority !== term.priority) {
                                          void handleUpdateSearchTerm(term.id, { priority });
                                        }
                                      }}
                                      inputMode="numeric"
                                      className="h-9 w-full min-w-0 rounded-lg border border-border bg-white px-2 text-xs text-slate-950 outline-none transition focus:border-primary"
                                    />
                                  </div>
                                  <div className="mt-2 grid min-w-0 gap-2 sm:grid-cols-[minmax(0,2fr)_auto_auto] sm:items-center">
                                    <input
                                      defaultValue={term.notes ?? ""}
                                      onBlur={(event) => {
                                        const notes = event.target.value.trim();
                                        if (notes !== (term.notes ?? "")) {
                                          void handleUpdateSearchTerm(term.id, { notes: notes || null });
                                        }
                                      }}
                                      placeholder="Sin notas. Agrega contexto opcional para este término."
                                      className="h-9 w-full min-w-0 rounded-lg border border-border bg-white px-2 text-xs text-slate-950 outline-none transition focus:border-primary"
                                    />
                                    <label className="inline-flex items-center gap-2 text-xs">
                                      <input
                                        type="checkbox"
                                        checked={term.is_active}
                                        onChange={(event) =>
                                          void handleUpdateSearchTerm(term.id, {
                                            is_active: event.target.checked,
                                          })
                                        }
                                      />
                                      Activo
                                    </label>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => handleDeleteSearchTerm(term.id)}
                                      disabled={isSavingProduct}
                                      className="w-full sm:w-auto sm:shrink-0"
                                    >
                                      Eliminar
                                    </Button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-muted-foreground">Sin términos de búsqueda del producto.</p>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="space-y-1">
                            <span className="text-xs text-muted-foreground">{getFriendlyFieldLabel("search_boost")}</span>
                            <input
                              value={selectedProduct.search_boost}
                              onChange={(event) =>
                                updateSelectedProductField(
                                  "search_boost",
                                  toNumberOrNull(event.target.value) ?? 0,
                                )
                              }
                              inputMode="numeric"
                              className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs text-muted-foreground">{getFriendlyFieldLabel("source_type")}</span>
                            <input
                              value={selectedProduct.source_type}
                              readOnly
                              className="h-10 w-full rounded-xl border border-border bg-slate-100 px-3 text-sm text-slate-700"
                            />
                          </label>
                        </div>

                        <label className="space-y-1">
                          <span className="text-xs text-muted-foreground">{getFriendlyFieldLabel("source_ref")}</span>
                          <input
                            value={selectedProduct.source_ref ?? ""}
                            readOnly
                            className="h-10 w-full rounded-xl border border-border bg-slate-100 px-3 text-sm text-slate-700"
                          />
                        </label>

                        <div className="flex flex-wrap gap-2">
                          <StatusBadge tone={selectedProduct.search_meta.exact_match ? "success" : "neutral"}>
                            {getFriendlyFieldLabel("exact_match")}: {selectedProduct.search_meta.exact_match ? "Sí" : "No"}
                          </StatusBadge>
                          <StatusBadge tone={selectedProduct.search_meta.direct_match ? "info" : "neutral"}>
                            {getFriendlyFieldLabel("direct_match")}: {selectedProduct.search_meta.direct_match ? "Sí" : "No"}
                          </StatusBadge>
                          <StatusBadge>{getFriendlyFieldLabel("match_quality")}: {selectedProduct.search_meta.match_quality}</StatusBadge>
                          <StatusBadge>Puntaje: {selectedProduct.search_meta.score.toFixed(2)}</StatusBadge>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {searchMetaMessage ??
                            "Los cambios en alias y términos de búsqueda se guardan en los datos reales y actualizan el índice."}
                        </p>
                      </fieldset>
                    ) : null}

                    {catalogTab === "multimedia" ? (
                      <div className="min-w-0 space-y-3">
                        <div className="rounded-2xl border border-border/70 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Imagen principal
                          </p>
                          {selectedProduct.search_meta.storage_bucket &&
                          selectedProduct.search_meta.storage_path ? (
                            <div className="mt-3 space-y-1 text-sm text-slate-800">
                              <p className="break-all">
                                {getFriendlyFieldLabel("primary_image_bucket")}: {selectedProduct.search_meta.storage_bucket}
                              </p>
                              <p className="break-all">
                                {getFriendlyFieldLabel("primary_image_path")}: {selectedProduct.search_meta.storage_path}
                              </p>
                              <p className="break-all">
                                {getFriendlyFieldLabel("primary_image_alt")}: {selectedProduct.search_meta.alt_text ?? "Sin texto alternativo"}
                              </p>
                            </div>
                          ) : (
                            <p className="mt-3 text-sm text-muted-foreground">Sin imagen primaria registrada.</p>
                          )}
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Imágenes del producto
                          </p>
                          <div className="mt-3 grid min-w-0 gap-2">
                            <label
                              className={`flex min-h-28 cursor-pointer items-center justify-center rounded-xl border border-dashed bg-white px-4 py-3 text-center text-sm text-slate-700 transition ${
                                isDraggingImage ? "border-primary" : "border-border hover:border-primary/70"
                              }`}
                              onDragOver={(event) => {
                                event.preventDefault();
                                setIsDraggingImage(true);
                              }}
                              onDragLeave={(event) => {
                                event.preventDefault();
                                setIsDraggingImage(false);
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                setIsDraggingImage(false);
                                const droppedFile = event.dataTransfer.files?.[0] ?? null;
                                setNewImageDraft((current) => {
                                  if (current.preview_url) {
                                    URL.revokeObjectURL(current.preview_url);
                                  }

                                  return {
                                    ...current,
                                    file: droppedFile,
                                    preview_url: droppedFile ? URL.createObjectURL(droppedFile) : null,
                                  };
                                });
                              }}
                            >
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={(event) => {
                                  const nextFile = event.target.files?.[0] ?? null;
                                  setNewImageDraft((current) => {
                                    if (current.preview_url) {
                                      URL.revokeObjectURL(current.preview_url);
                                    }

                                    return {
                                      ...current,
                                      file: nextFile,
                                      preview_url: nextFile ? URL.createObjectURL(nextFile) : null,
                                    };
                                  });
                                  setIsDraggingImage(false);
                                }}
                              />
                              <span>
                                {newImageDraft.file
                                  ? `${newImageDraft.file.name} (${Math.ceil(newImageDraft.file.size / 1024)} KB)`
                                  : "Arrastra o selecciona una imagen (JPG, PNG, WEBP, max 3MB)"}
                              </span>
                            </label>
                            {newImageDraft.preview_url ? (
                              <div className="overflow-hidden rounded-xl border border-border bg-white p-2">
                                <Image
                                  src={newImageDraft.preview_url}
                                  alt="Preview local"
                                  width={500}
                                  height={320}
                                  unoptimized
                                  className="h-auto max-h-56 w-full rounded-lg object-contain"
                                />
                              </div>
                            ) : null}
                            <input
                              value={newImageDraft.alt_text}
                              onChange={(event) =>
                                setNewImageDraft((current) => ({
                                  ...current,
                                  alt_text: event.target.value,
                                }))
                              }
                              placeholder={getFriendlyFieldLabel("alt_text")}
                              className="h-10 w-full min-w-0 rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleAddImage}
                              disabled={!newImageDraft.file || isSavingProduct || isUpdatingMedia}
                              className="w-full sm:w-auto sm:shrink-0"
                            >
                              Subir imagen
                            </Button>
                          </div>
                          <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-700">
                            <input
                              type="checkbox"
                              checked={newImageDraft.mark_as_primary}
                              onChange={(event) =>
                                setNewImageDraft((current) => ({
                                  ...current,
                                  mark_as_primary: event.target.checked,
                                }))
                              }
                            />
                            Marcar como principal
                          </label>
                          <div className="mt-3 space-y-2 text-sm">
                            {selectedProduct.images.length > 0 ? (
                              selectedProduct.images.map((image) => (
                                <div key={image.id} className="rounded-xl bg-white px-3 py-2">
                                  <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                                    <div className="min-w-0 space-y-1">
                                      <p className="break-all text-xs text-muted-foreground">{image.storage_bucket}</p>
                                      <p className="break-all text-xs text-muted-foreground">{image.storage_path}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 sm:justify-end">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleDeleteImage(image.id)}
                                        disabled={isSavingProduct || isUpdatingMedia}
                                      >
                                        Eliminar
                                      </Button>
                                    </div>
                                  </div>
                                  {image.signed_url ? (
                                    <div className="mt-2 overflow-hidden rounded-lg border border-border bg-slate-50 p-2">
                                      <Image
                                        src={image.signed_url}
                                        alt={image.alt_text ?? `Imagen ${selectedProduct.name}`}
                                        width={480}
                                        height={280}
                                        className="h-auto max-h-48 w-full rounded-md object-contain"
                                      />
                                    </div>
                                  ) : null}
                                  <div className="mt-2 grid min-w-0 gap-2 sm:grid-cols-[minmax(0,2fr)] sm:items-center">
                                    <input
                                      defaultValue={image.alt_text ?? ""}
                                      onBlur={(event) => {
                                        const nextAlt = event.target.value.trim();
                                        if (nextAlt !== (image.alt_text ?? "")) {
                                          void handleUpdateImageAlt(image.id, nextAlt);
                                        }
                                      }}
                                      placeholder={getFriendlyFieldLabel("alt_text")}
                                      className="h-9 w-full min-w-0 rounded-lg border border-border bg-white px-2 text-xs text-slate-950 outline-none transition focus:border-primary"
                                    />
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {image.is_primary ? "principal" : "secundaria"} · creada{" "}
                                    {formatDateTime(image.created_at)}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <p className="text-muted-foreground">No hay imagenes cargadas.</p>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {searchMetaMessage ??
                            "Si eliminas la principal y quedan imágenes, se promueve automáticamente la de menor orden de visualización."}
                        </p>
                      </div>
                    ) : null}

                    {catalogTab === "reglas" ? (
                      <fieldset className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="inline-flex items-center gap-2 text-sm text-slate-800">
                            <input
                              type="checkbox"
                              checked={selectedProduct.allows_name}
                              onChange={(event) =>
                                updateSelectedProductField("allows_name", event.target.checked)
                              }
                            />
                            {getFriendlyFieldLabel("allows_name")}
                          </label>
                          <label className="inline-flex items-center gap-2 text-sm text-slate-800">
                            <input
                              type="checkbox"
                              checked={selectedProduct.extra_adjustment_has_cost}
                              onChange={(event) =>
                                updateSelectedProductField(
                                  "extra_adjustment_has_cost",
                                  event.target.checked,
                                )
                              }
                            />
                            {getFriendlyFieldLabel("extra_adjustment_has_cost")}
                          </label>
                          <label className="inline-flex items-center gap-2 text-sm text-slate-800">
                            <input
                              type="checkbox"
                              checked={selectedProduct.requires_design_approval}
                              onChange={(event) =>
                                updateSelectedProductField(
                                  "requires_design_approval",
                                  event.target.checked,
                                )
                              }
                            />
                            {getFriendlyFieldLabel("requires_design_approval")}
                          </label>
                          <label className="inline-flex items-center gap-2 text-sm text-slate-800">
                            <input
                              type="checkbox"
                              checked={selectedProduct.is_active}
                              onChange={(event) =>
                                updateSelectedProductField("is_active", event.target.checked)
                              }
                            />
                            {getFriendlyFieldLabel("is_active")}
                          </label>
                          <label className="inline-flex items-center gap-2 text-sm text-slate-800">
                            <input
                              type="checkbox"
                              checked={selectedProduct.is_agent_visible}
                              onChange={(event) =>
                                updateSelectedProductField(
                                  "is_agent_visible",
                                  event.target.checked,
                                )
                              }
                            />
                            {getFriendlyFieldLabel("is_agent_visible")}
                          </label>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="space-y-1">
                            <span className="text-xs text-muted-foreground">
                              {getFriendlyFieldLabel("includes_design_adjustment_count")}
                            </span>
                            <input
                              value={selectedProduct.includes_design_adjustment_count}
                              onChange={(event) =>
                                updateSelectedProductField(
                                  "includes_design_adjustment_count",
                                  toNumberOrNull(event.target.value) ?? 0,
                                )
                              }
                              inputMode="numeric"
                              className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs text-muted-foreground">{getFriendlyFieldLabel("sort_order")}</span>
                            <input
                              value={selectedProduct.sort_order}
                              onChange={(event) =>
                                updateSelectedProductField(
                                  "sort_order",
                                  toNumberOrNull(event.target.value) ?? 0,
                                )
                              }
                              inputMode="numeric"
                              className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                            />
                          </label>
                        </div>
                      </fieldset>
                          ) : null}

                          {catalogTab === "seguridad" ? (
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                          <div className="flex items-start gap-2">
                            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                            <p>
                              Campos sensibles: <strong>id</strong> y <strong>sku</strong>. `id` es
                              solo lectura.
                            </p>
                          </div>
                        </div>

                        <label className="space-y-1">
                          <span className="text-xs text-muted-foreground">id (solo lectura)</span>
                          <input
                            value={selectedProduct.id}
                            readOnly
                            className="h-10 w-full rounded-xl border border-border bg-slate-100 px-3 text-sm text-slate-700"
                          />
                        </label>

                        <div className="rounded-2xl border border-border/70 bg-slate-50 p-3">
                          <label className="inline-flex items-center gap-2 text-sm text-slate-900">
                            <input
                              type="checkbox"
                              checked={skuControlEnabled}
                              onChange={(event) => setSkuControlEnabled(event.target.checked)}
                              disabled
                            />
                            Habilitar edición controlada de SKU
                          </label>
                          <div className="mt-3 flex gap-2">
                            <input
                              value={skuDraft}
                              onChange={(event) => setSkuDraft(event.target.value)}
                              disabled
                              className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={applySkuDraft}
                              disabled
                            >
                              Aplicar
                            </Button>
                          </div>
                        </div>

                        <label className="space-y-1">
                          <span className="text-xs text-muted-foreground">{getFriendlyFieldLabel("source_type")}</span>
                          <input
                            value={selectedProduct.source_type}
                            readOnly
                            className="h-10 w-full rounded-xl border border-border bg-slate-100 px-3 text-sm text-slate-700"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs text-muted-foreground">{getFriendlyFieldLabel("source_ref")}</span>
                          <input
                            value={selectedProduct.source_ref ?? ""}
                            readOnly
                            className="h-10 w-full rounded-xl border border-border bg-slate-100 px-3 text-sm text-slate-700"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs text-muted-foreground">{getFriendlyFieldLabel("updated_at")}</span>
                          <input
                            value={formatDateTime(selectedProduct.updated_at)}
                            readOnly
                            className="h-10 w-full rounded-xl border border-border bg-slate-100 px-3 text-sm text-slate-700"
                          />
                        </label>
                      </div>
                          ) : null}
                          </div>

                          {showEditHelpPopup ? (
                            <div
                              className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4"
                              onMouseDown={onEditHelpBackdropMouseDown}
                            >
                              <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_48px_-24px_rgba(2,6,23,0.35)]">
                                <div className="flex items-center justify-between gap-3">
                                  <h4 className="text-lg font-semibold text-slate-900">
                                    Guía: Editar Producto ({catalogTabs.find((tab) => tab.id === catalogTab)?.label ?? "General"})
                                  </h4>
                                  <Button type="button" variant="outline" size="sm" onClick={() => setShowEditHelpPopup(false)}>
                                    Cerrar
                                  </Button>
                                </div>
                                <div className="mt-4 space-y-3 text-sm text-slate-700">
                                  {catalogTab === "general" ? (
                                    <>
                                      <p><strong>Nombre, familia y categoría:</strong> Usa valores comerciales claros y consistentes para facilitar búsqueda y reportes.</p>
                                      <p><strong>Variante y tamaño:</strong> Agrega solo diferenciadores reales del producto; si no aplica, déjalo vacío.</p>
                                      <p><strong>Resumen:</strong> Es clave para publicación NOVA; escribe un texto corto, útil y directo.</p>
                                      <p><strong>Términos de búsqueda:</strong> Mantén términos relevantes y activos para sostener el descubrimiento del producto.</p>
                                    </>
                                  ) : null}
                                  {catalogTab === "precios" ? (
                                    <>
                                      <p><strong>Modalidad de precio:</strong> Precio fijo, precio por rangos o precio variable según el caso.</p>
                                      <p><strong>Precio fijo y precio base de rangos:</strong> Completa según el modo elegido para evitar inconsistencias comerciales.</p>
                                      <p><strong>Editor de rangos:</strong> Solo aparece en `Precio por rangos`. Permite crear tramos con mínimo, máximo opcional y precio unitario.</p>
                                      <p><strong>Precio variable:</strong> Se interpreta como cotización manual y no utiliza rangos.</p>
                                      <p><strong>Cantidad mínima:</strong> Define el mínimo real de venta para evitar cotizaciones inválidas.</p>
                                      <p><strong>Visibilidad de descuento y permiso de descuento:</strong> Alinea esta combinación con la política comercial del producto.</p>
                                    </>
                                  ) : null}
                                  {catalogTab === "busqueda" ? (
                                    <>
                                      <p><strong>Alias:</strong> Agrega variaciones reales del nombre que los clientes sí usan.</p>
                                      <p><strong>Términos de búsqueda:</strong> Prioriza términos específicos y activos para mejorar el posicionamiento.</p>
                                      <p><strong>Prioridad:</strong> Menor número implica más prioridad en el motor de búsqueda.</p>
                                      <p><strong>Prioridad de búsqueda:</strong> Úsala solo cuando exista una justificación comercial.</p>
                                    </>
                                  ) : null}
                                  {catalogTab === "multimedia" ? (
                                    <>
                                      <p><strong>Imagen principal:</strong> Mantén una imagen principal válida para evitar respuestas sin contexto visual.</p>
                                      <p><strong>Contenedor y ruta del archivo:</strong> Deben apuntar a archivos existentes en el repositorio de imágenes.</p>
                                      <p><strong>Texto alternativo:</strong> Describe la imagen de forma breve para mejorar el contexto del catálogo.</p>
                                      <p><strong>Orden de visualización:</strong> Ordena de menor a mayor para controlar prioridad visual.</p>
                                    </>
                                  ) : null}
                                  {catalogTab === "reglas" ? (
                                    <>
                                      <p><strong>Activo:</strong> Si está inactivo, no debería operar comercialmente.</p>
                                      <p><strong>Visible para el agente:</strong> Actívalo solo cuando el producto esté listo para el agente.</p>
                                      <p><strong>Personalización y aprobación de diseño:</strong> Ajusta estas opciones según el flujo real.</p>
                                      <p><strong>Orden de visualización:</strong> Úsalo para priorizar cuando compita con productos similares.</p>
                                    </>
                                  ) : null}
                                  {catalogTab === "seguridad" ? (
                                    <>
                                      <p><strong>ID y campos de origen:</strong> Son campos de trazabilidad; se mantienen de solo lectura.</p>
                                      <p><strong>sku:</strong> Su edición controlada está deshabilitada para proteger integridad operativa.</p>
                                      <p><strong>Última actualización:</strong> Permite verificar cuándo se aplicó el último cambio.</p>
                                    </>
                                  ) : null}
                                </div>
                              </section>
                            </div>
                          ) : null}
                        </section>
                      </div>
                    ) : null}
                  </div>
                )}
              </section>
            </>
          ) : (
            <>
              <section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/70">
                      Top productos vendidos
                    </p>
                    <p className="text-sm text-muted-foreground">Top 5 real por rango seleccionado</p>
                  </div>
                  <select
                    value={topPeriod}
                    onChange={(event) => setTopPeriod(event.target.value as ProductsPerformanceRange)}
                    className="h-9 rounded-xl border border-border bg-white px-3 text-xs text-slate-950 outline-none transition focus:border-primary"
                  >
                    <option value="7d">7 dias</option>
                    <option value="30d">30 dias</option>
                    <option value="90d">90 dias</option>
                    <option value="all">Todo el tiempo</option>
                  </select>
                </div>
                <div className="mt-3 inline-flex rounded-xl border border-border bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setPerformanceMetric("units")}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      performanceMetric === "units"
                        ? "bg-slate-950 text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Unidades
                  </button>
                  <button
                    type="button"
                    onClick={() => setPerformanceMetric("revenue")}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      performanceMetric === "revenue"
                        ? "bg-slate-950 text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Ingresos
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {topProductsByPeriod.map((row) => {
                    const value =
                      performanceMetric === "units" ? row.units_sold : row.revenue_crc;
                    const widthPercent = (value / topReferenceValue) * 100;

                    return (
                      <div key={row.product_id} className="space-y-1">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <p className="truncate font-medium text-slate-900">{row.name}</p>
                          <p className="shrink-0 text-xs text-muted-foreground">
                            {performanceMetric === "units"
                              ? value.toLocaleString("es-CR")
                              : formatCurrencyCRC(value)}
                          </p>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200">
                          <div
                            className="h-2 rounded-full bg-[linear-gradient(90deg,hsl(var(--chart-1)),hsl(var(--chart-2)))]"
                            style={{ width: `${Math.max(widthPercent, 4)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)]">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/70">
                  Tendencia de ventas
                </p>
                <p className="text-sm text-muted-foreground">
                  Serie real por {performanceData?.date_anchor ?? "orders.created_at"} con
                  granularidad {performanceData?.trend_granularity === "week" ? " semanal" : " diaria"}.
                </p>
                <div className="mt-4">
                  <TrendChart points={performanceData?.sales_trend ?? []} metric={performanceMetric} />
                </div>
              </section>

              <section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)]">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/70">
                  Insights rapidos
                </p>
                <div className="mt-3 space-y-3 text-sm text-slate-800">
                  <div className="rounded-xl border border-border/70 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                      Mayor crecimiento
                    </p>
                    <p className="mt-1 font-medium">
                      {resolveProductName(performanceData?.insights.highest_growth_product_id ?? null)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                      Caida mas fuerte
                    </p>
                    <p className="mt-1 font-medium">
                      {resolveProductName(performanceData?.insights.strongest_drop_product_id ?? null)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                      Top performer
                    </p>
                    <p className="mt-1 font-medium">
                      {resolveProductName(performanceData?.insights.top_performer_product_id ?? null)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                      Producto sin ventas
                    </p>
                    <p className="mt-1 font-medium">
                      {resolveProductName(performanceData?.insights.product_without_sales_id ?? null)}
                    </p>
                  </div>
                </div>
              </section>
            </>
          )}
        </aside>
      </section>

      {isDiscardChangesOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-[2px]"
          onMouseDown={onDiscardBackdropMouseDown}
        >
          <div className="w-full max-w-md rounded-[24px] border border-white/80 bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                Cambios no guardados
              </p>
              <h4 className="text-lg font-semibold text-slate-950">Hay cambios pendientes en el editor</h4>
              <p className="text-sm text-muted-foreground">
                Si sales ahora, se perdera el draft local y no se guardara nada en base de datos.
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleContinueEditing}>
                Continuar editando
              </Button>
              <Button type="button" onClick={handleDiscardChangesConfirm}>
                Descartar cambios
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <UnsavedChangesDialog
        isOpen={isCreateDiscardChangesOpen}
        onContinueEditing={() => setIsCreateDiscardChangesOpen(false)}
        onDiscardChanges={() => {
          setIsCreateDiscardChangesOpen(false);
          setIsCreateOpen(false);
          setCreateStatusMessage(null);
          setCreateFeedbackItems([]);
        }}
        isDisabled={isSavingProduct}
        title="Hay cambios pendientes en el nuevo producto"
        description="Si sales ahora, se perdera el draft del producto y no se guardara nada en base de datos."
      />

      {isCreateOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/30 px-4 py-6 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          onMouseDown={onCreateBackdropMouseDown}
        >
          <div className="w-full max-w-[1240px] rounded-[30px] border border-white/80 bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.18)] sm:p-6">
            <div className="border-b border-border/70 pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/80">
                    Nuevo producto
                  </p>
                  <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                    Agrega un producto a tu catálogo
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Flujo NOVA: crea interno o publica solo cuando cumple contrato.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateHelpPopup(true)}
                  className="text-xs font-semibold text-sky-700 transition hover:text-sky-800"
                >
                  ¿Necesitas ayuda?
                </button>
              </div>
            </div>

            <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,2.05fr)_minmax(320px,1fr)] lg:items-stretch">
              <div className="space-y-4 pr-1">
                <section className="space-y-3 rounded-2xl border border-border/70 bg-slate-50/55 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary/80">
                      1. Identidad del producto
                    </p>
                    <StatusBadge tone={createIdentitySectionReady ? "success" : "neutral"}>
                      {createIdentitySectionReady ? "Completo" : "Pendiente"}
                    </StatusBadge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-xs text-muted-foreground">Nombre del producto</span>
                      <input
                        value={createDraft.name}
                        onChange={(event) =>
                          setCreateDraft((current) => ({ ...current, name: event.target.value }))
                        }
                        className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-muted-foreground">SKU (autogenerado)</span>
                      <div className="flex h-10 w-full items-center rounded-xl border border-border bg-slate-100 px-3 text-sm font-medium text-slate-700">
                        {createSkuPreviewValue || "Se genera al seleccionar categoría y familia"}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Generado automáticamente según tu selección.
                      </p>
                      {createSkuPreviewWarning ? (
                        <p className="text-xs text-amber-700">{createSkuPreviewWarning}</p>
                      ) : null}
                    </label>
                    <SuggestionInput
                      label="Categoría"
                      value={createDraft.category}
                      options={categoryOptions}
                      placeholder="Ej. Hogar, Ropa"
                      createOptionLabel="Crear categoría"
                      onChange={(nextValue) =>
                        setCreateDraft((current) => ({ ...current, category: nextValue }))
                      }
                    />
                    <SuggestionInput
                      label="Familia"
                      value={createDraft.family}
                      options={familyOptions}
                      placeholder="Ej. Bolsos escolares, Caminata"
                      createOptionLabel="Crear familia"
                      onChange={(nextValue) =>
                        setCreateDraft((current) => ({ ...current, family: nextValue }))
                      }
                    />
                    <SuggestionInput
                      label={getFriendlyFieldLabel("variant_label")}
                      value={createDraft.variant_label}
                      options={variantOptions}
                      placeholder="Ej. premium, escarchado"
                      createOptionLabel="Crear variante"
                      onChange={(nextValue) =>
                        setCreateDraft((current) => ({ ...current, variant_label: nextValue }))
                      }
                    />
                    <SuggestionInput
                      label={getFriendlyFieldLabel("size_label")}
                      value={createDraft.size_label}
                      options={sizeOptions}
                      placeholder="Ej. 20x25 cm"
                      createOptionLabel="Crear tamaño"
                      onChange={(nextValue) =>
                        setCreateDraft((current) => ({ ...current, size_label: nextValue }))
                      }
                    />
                    <SuggestionInput
                      label="Material"
                      value={createDraft.material}
                      options={materialOptions}
                      placeholder="Ej. plástico, tela poliester"
                      createOptionLabel="Crear material"
                      onChange={(nextValue) =>
                        setCreateDraft((current) => ({ ...current, material: nextValue }))
                      }
                    />
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Publicar al agente NOVA</span>
                      <select
                        value={createDraft.publication_mode === "nova" ? "true" : "false"}
                        onChange={(event) =>
                          setCreateDraft((current) => ({
                            ...current,
                            publication_mode: event.target.value === "true" ? "nova" : "internal",
                          }))
                        }
                        className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                        title={
                          !canPublishCreateDraftToNova
                            ? "Solo aplica cuando cumple validaciones NOVA"
                            : undefined
                        }
                      >
                        <option value="false">False</option>
                        <option value="true" disabled={!canPublishCreateDraftToNova}>
                          True
                        </option>
                      </select>
                      {!canPublishCreateDraftToNova ? (
                        <p className="text-xs text-muted-foreground">
                          Solo aplica cuando cumple validaciones NOVA.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </section>

                <section className="space-y-3 rounded-2xl border border-border/70 bg-slate-50/55 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary/80">
                      2. Precio y reglas comerciales
                    </p>
                    <StatusBadge tone={createPricingSectionReady ? "success" : "neutral"}>
                      {createPricingSectionReady ? "Completo" : "Pendiente"}
                    </StatusBadge>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-3">
                    <label className="space-y-1">
                      <span className="text-xs text-muted-foreground">{getFriendlyFieldLabel("pricing_mode")}</span>
                      <select
                        value={createDraft.pricing_mode}
                        onChange={(event) =>
                          setCreateDraft((current) => ({
                            ...current,
                            pricing_mode: event.target.value as ProductPricingMode,
                            price_crc:
                              event.target.value === "range" ? "" : current.price_crc,
                            price_from_crc:
                              event.target.value === "range" ? current.price_from_crc : "",
                          }))
                        }
                        className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                      >
                        <option value="fixed">{getFriendlyPricingModeLabel("fixed")}</option>
                        <option value="range">{getFriendlyPricingModeLabel("range")}</option>
                        <option value="variable">{getFriendlyPricingModeLabel("variable")}</option>
                      </select>
                    </label>
                    {createDraft.pricing_mode === "fixed" ? (
                      <label className="space-y-1">
                        <span className="text-xs text-muted-foreground">{getFriendlyFieldLabel("price_crc")}</span>
                        <input
                          value={
                            isEditingCreatePriceCrc
                              ? createDraft.price_crc
                              : formatDecimalDisplay(createDraft.price_crc)
                          }
                          onChange={(event) =>
                            setCreateDraft((current) => ({
                              ...current,
                              price_crc: normalizeDecimalRawInput(event.target.value),
                            }))
                          }
                          onFocus={() => setIsEditingCreatePriceCrc(true)}
                          onBlur={() => handleCreatePriceBlur("price_crc")}
                          inputMode="decimal"
                          placeholder="Ej. 2 500.00"
                          className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                        />
                      </label>
                    ) : null}
                    {createDraft.pricing_mode === "range" ? (
                      <label className="space-y-1">
                        <span className="text-xs text-muted-foreground">{getFriendlyFieldLabel("price_from_crc")}</span>
                        <input
                          value={
                            isEditingCreatePriceFromCrc
                              ? createDraft.price_from_crc
                              : formatDecimalDisplay(createDraft.price_from_crc)
                          }
                          onChange={(event) =>
                            setCreateDraft((current) => ({
                              ...current,
                              price_from_crc: normalizeDecimalRawInput(event.target.value),
                            }))
                          }
                          onFocus={() => setIsEditingCreatePriceFromCrc(true)}
                          onBlur={() => handleCreatePriceBlur("price_from_crc")}
                          inputMode="decimal"
                          placeholder="Ej. 15 567.64"
                          className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                        />
                      </label>
                    ) : null}
                    {createDraft.pricing_mode === "variable" ? (
                      <>
                        <label className="space-y-1">
                          <span className="text-xs text-muted-foreground">Precio base interno</span>
                          <input
                            value={
                              isEditingCreatePriceCrc
                                ? createDraft.price_crc
                                : formatDecimalDisplay(createDraft.price_crc)
                            }
                            onChange={(event) =>
                              setCreateDraft((current) => ({
                                ...current,
                                price_crc: normalizeDecimalRawInput(event.target.value),
                              }))
                            }
                            onFocus={() => setIsEditingCreatePriceCrc(true)}
                            onBlur={() => handleCreatePriceBlur("price_crc")}
                            inputMode="decimal"
                            placeholder="Ej. 2 500.00"
                            className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                          />
                        </label>
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 lg:col-span-2">
                          Este modo no cotiza automático. Se enviará a revisión manual.
                        </div>
                      </>
                    ) : null}
                    {createDraft.pricing_mode === "variable" ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 lg:col-span-3">
                        Los rangos estructurales solo aplican cuando el modo es <strong>Precio por rangos</strong>.
                      </div>
                    ) : null}
                    {isCreateRangePricingMode ? (
                      <div className="space-y-2 rounded-2xl border border-border/70 bg-slate-50/80 p-3 lg:col-span-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Rangos estructurales
                          </p>
                          <Button type="button" variant="outline" size="sm" onClick={handleAddCreateRange}>
                            Agregar rango
                          </Button>
                        </div>
                        {createDraft.range_prices.length > 0 ? (
                          <div className="space-y-2">
                            {sortCreateRangeDraftRows(createDraft.range_prices).map((range) => (
                              <div
                                key={range.local_id}
                                className="grid gap-2 rounded-xl border border-border/60 bg-white p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto]"
                              >
                                <label className="space-y-1">
                                  <span className="text-[11px] text-muted-foreground">Desde qty</span>
                                  <input
                                    value={range.range_min_qty}
                                    inputMode="numeric"
                                    onChange={(event) =>
                                      handleUpdateCreateRange(range.local_id, {
                                        range_min_qty: event.target.value,
                                      })
                                    }
                                    className="h-9 w-full rounded-lg border border-border bg-white px-2 text-xs text-slate-950 outline-none transition focus:border-primary"
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-[11px] text-muted-foreground">Hasta qty</span>
                                  <input
                                    value={range.range_max_qty}
                                    inputMode="numeric"
                                    disabled={range.is_open_ended}
                                    onChange={(event) =>
                                      handleUpdateCreateRange(range.local_id, {
                                        range_max_qty: event.target.value,
                                      })
                                    }
                                    className="h-9 w-full rounded-lg border border-border bg-white px-2 text-xs text-slate-950 outline-none transition focus:border-primary disabled:bg-slate-100 disabled:text-slate-500"
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-[11px] text-muted-foreground">Precio unitario</span>
                                  <input
                                    value={range.unit_price_crc}
                                    inputMode="numeric"
                                    onChange={(event) =>
                                      handleUpdateCreateRange(range.local_id, {
                                        unit_price_crc: event.target.value,
                                      })
                                    }
                                    className="h-9 w-full rounded-lg border border-border bg-white px-2 text-xs text-slate-950 outline-none transition focus:border-primary"
                                  />
                                </label>
                                <label className="inline-flex items-center gap-1 text-xs text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={range.is_open_ended}
                                    onChange={(event) =>
                                      handleUpdateCreateRange(range.local_id, {
                                        is_open_ended: event.target.checked,
                                        range_max_qty: event.target.checked ? "" : range.range_max_qty,
                                      })
                                    }
                                  />
                                  Abierto
                                </label>
                                <div className="flex items-center justify-end gap-2">
                                  <label className="inline-flex items-center gap-1 text-xs text-slate-700">
                                    <input
                                      type="checkbox"
                                      checked={range.is_active}
                                      onChange={(event) =>
                                        handleUpdateCreateRange(range.local_id, {
                                          is_active: event.target.checked,
                                        })
                                      }
                                    />
                                    Activo
                                  </label>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteCreateRange(range.local_id)}
                                  >
                                    Eliminar
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Agrega al menos un rango para guardar productos en modo rangos.
                          </p>
                        )}
                      </div>
                    ) : null}
                    <div className="space-y-3 lg:col-span-3 lg:space-y-0">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,220px)_minmax(0,320px)_minmax(0,220px)] lg:items-end">
                        <label className="space-y-1">
                          <span className="text-xs text-muted-foreground">{getFriendlyFieldLabel("min_qty")}</span>
                          <input
                            value={createDraft.min_qty}
                            onChange={(event) =>
                              setCreateDraft((current) => ({ ...current, min_qty: event.target.value }))
                            }
                            inputMode="numeric"
                            className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                          />
                        </label>
                        <label className="space-y-1 sm:col-span-2 lg:col-span-1">
                          <span className="text-xs text-muted-foreground">{getFriendlyFieldLabel("discount_visibility")}</span>
                          <select
                            value={createDraft.discount_visibility}
                            onChange={(event) =>
                              setCreateDraft((current) => ({
                                ...current,
                                discount_visibility: event.target.value as ProductDiscountVisibility,
                              }))
                            }
                            disabled={!createDraft.is_discountable}
                            className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary disabled:bg-slate-100"
                          >
                            <option value="never">{getFriendlyDiscountVisibilityLabel("never")}</option>
                            <option value="only_if_customer_requests">
                              {getFriendlyDiscountVisibilityLabel("only_if_customer_requests")}
                            </option>
                            <option value="internal_only">{getFriendlyDiscountVisibilityLabel("internal_only")}</option>
                            <option value="always">{getFriendlyDiscountVisibilityLabel("always")}</option>
                          </select>
                        </label>
                        <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-border/80 bg-white px-3 text-sm text-slate-800">
                          <input
                            type="checkbox"
                            checked={createDraft.is_discountable}
                            onChange={(event) =>
                              setCreateDraft((current) => ({
                                ...current,
                                is_discountable: event.target.checked,
                                discount_visibility: event.target.checked
                                  ? current.discount_visibility
                                  : "never",
                              }))
                            }
                          />
                          {getFriendlyFieldLabel("is_discountable")}
                        </label>
                      </div>
                    </div>
                    <div className="space-y-2 lg:col-span-3">
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        <label className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-border/80 bg-white px-3 py-2 text-sm text-slate-800">
                          <input
                            type="checkbox"
                            checked={createDraft.is_active}
                            onChange={(event) =>
                              setCreateDraft((current) => ({
                                ...current,
                                is_active: event.target.checked,
                              }))
                            }
                          />
                          {getFriendlyFieldLabel("is_active")}
                        </label>
                        <label className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-border/80 bg-white px-3 py-2 text-sm text-slate-800">
                          <input
                            type="checkbox"
                            checked={createDraft.allows_name}
                            onChange={(event) =>
                              setCreateDraft((current) => ({ ...current, allows_name: event.target.checked }))
                            }
                          />
                          {getFriendlyFieldLabel("allows_name")}
                        </label>
                        <label className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-border/80 bg-white px-3 py-2 text-sm text-slate-800">
                          <input
                            type="checkbox"
                            checked={createDraft.requires_design_approval}
                            onChange={(event) =>
                              setCreateDraft((current) => ({
                                ...current,
                                requires_design_approval: event.target.checked,
                              }))
                            }
                          />
                          {getFriendlyFieldLabel("requires_design_approval")}
                        </label>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-3 rounded-2xl border border-border/70 bg-slate-50/55 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary/80">
                      3. Contenido para NOVA
                    </p>
                    <StatusBadge tone={createNovaContentSectionReady ? "success" : "neutral"}>
                      {createNovaContentSectionReady ? "Completo" : "Pendiente"}
                    </StatusBadge>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-3">
                    <label className="space-y-1">
                      <span className="text-xs text-muted-foreground">Resumen</span>
                      <textarea
                        value={createDraft.summary}
                        onChange={(event) =>
                          setCreateDraft((current) => ({ ...current, summary: event.target.value }))
                        }
                        rows={4}
                        className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-primary"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-muted-foreground">Detalle</span>
                      <textarea
                        value={createDraft.details}
                        onChange={(event) =>
                          setCreateDraft((current) => ({ ...current, details: event.target.value }))
                        }
                        rows={4}
                        className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-primary"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-muted-foreground">{getFriendlyFieldLabel("search_terms")}</span>
                      <textarea
                        value={createDraft.search_terms_raw}
                        onChange={(event) =>
                          setCreateDraft((current) => ({ ...current, search_terms_raw: event.target.value }))
                        }
                        rows={4}
                        placeholder="Agregar términos separados por coma y presionar Enter"
                        className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-primary"
                      />
                    </label>
                  </div>
                </section>
              </div>

              <aside className="space-y-3 lg:sticky lg:top-0 lg:flex lg:h-full lg:flex-col lg:self-stretch">
                <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                  <StatusBadge tone={createDraftNovaValidation.isNovaReady ? "success" : "warning"}>
                    {createDraftNovaValidation.isNovaReady ? "Listo para NOVA" : "Incompleto para NOVA"}
                  </StatusBadge>
                  <p className="mt-2 text-sm text-slate-700">
                    Completa los campos requeridos para publicar al agente NOVA.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCreateDetailsPopup(true)}
                    className="mt-2 text-sm font-semibold text-sky-700 transition hover:text-sky-800"
                  >
                    Ver detalles
                  </button>
                </section>

                <section className="space-y-3 rounded-2xl border border-border/70 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary/80">
                    Estado de publicación NOVA
                  </p>
                  {createDraftNovaValidation.blockingIssues.length > 0 ? (
                    <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-rose-700">
                        {createDraftNovaValidation.blockingIssues.length} errores bloqueantes
                      </p>
                      <ul className="space-y-1 text-xs text-rose-700">
                        {createDraftNovaValidation.blockingIssues.map((issue) => (
                          <li key={`create-blocking:${issue}`}>• {toFriendlyOperationalMessage(issue)}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                      No hay errores bloqueantes.
                    </div>
                  )}
                  <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-sky-700">
                      Información
                    </p>
                    <p className="mt-1 text-xs text-slate-700">
                      Search terms activos y útiles: {createDraftNovaValidation.usableSearchTerms.length}
                    </p>
                  </div>
                  <div className="space-y-1.5 border-t border-border/60 pt-2 text-sm text-slate-700">
                    <div className="flex items-center justify-between">
                      <span>Identidad del producto</span>
                      <span className={createIdentitySectionReady ? "text-emerald-700" : "text-slate-500"}>
                        {createIdentitySectionReady ? "Completo" : "Pendiente"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Precio y reglas comerciales</span>
                      <span className={createPricingSectionReady ? "text-emerald-700" : "text-slate-500"}>
                        {createPricingSectionReady ? "Completo" : "Pendiente"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Contenido para NOVA</span>
                      <span className={createNovaContentSectionReady ? "text-emerald-700" : "text-slate-500"}>
                        {createNovaContentSectionReady ? "Completo" : "Pendiente"}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
                  <p className="text-sm font-semibold text-primary">¿Cómo publica NOVA?</p>
                  <p className="mt-2 text-sm text-slate-700">
                    El producto se crea primero como interno. Puedes publicarlo al agente NOVA cuando el estado sea &quot;Listo para NOVA&quot;.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCreateHelpPopup(true)}
                    className="mt-2 text-sm font-semibold text-sky-700 transition hover:text-sky-800"
                  >
                    Ver guía rápida
                  </button>
                </section>

                <section className="space-y-2 rounded-2xl border border-border/70 bg-white p-3 lg:mt-auto lg:flex lg:flex-1 lg:flex-col">
                  <Button
                    type="button"
                    onClick={createLocalProduct}
                    disabled={isSavingProduct}
                    className="h-9 w-full text-sm"
                  >
                    {isSavingProduct
                      ? "Creando..."
                      : createDraft.publication_mode === "nova"
                        ? "Crear y publicar al agente"
                        : "Guardar producto interno"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Solo se publica cuando el estado está listo.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeCreateModal}
                    disabled={isSavingProduct}
                    className="h-8 w-full text-sm"
                  >
                    Cancelar
                  </Button>
                  <div className="space-y-2 rounded-xl border border-border/70 bg-slate-50/50 p-2.5 lg:flex-1">
                    <p className="text-xs text-muted-foreground">
                      {createStatusMessage ??
                        "El producto se crea primero como interno y, si aplica, se publica al agente al completar validación NOVA."}
                    </p>
                    <FeedbackList items={createFeedbackItems} />
                  </div>
                </section>
              </aside>
            </div>
          </div>

          {showCreateDetailsPopup ? (
            <div
              className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4"
              onMouseDown={onCreateDetailsBackdropMouseDown}
            >
              <section className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_48px_-24px_rgba(2,6,23,0.35)]">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-lg font-semibold text-slate-900">Detalle del nuevo producto</h4>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateDetailsPopup(false)}>
                    Cerrar
                  </Button>
                </div>
                <div className="mt-4 grid gap-4 text-sm text-slate-700 sm:grid-cols-2">
                  <div className="space-y-2 rounded-xl border border-border/70 bg-slate-50/60 p-3 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary/80">Estado NOVA</p>
                    <p className="text-sm">
                      {createDraftNovaValidation.isNovaReady ? "Listo para NOVA" : "Incompleto para NOVA"}
                    </p>
                    {createDraftNovaValidation.blockingIssues.length > 0 ? (
                      <ul className="space-y-1 text-xs text-rose-700">
                        {createDraftNovaValidation.blockingIssues.map((issue) => (
                          <li key={`detail-blocking:${issue}`}>• {toFriendlyOperationalMessage(issue)}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>

                  <div className="space-y-1 rounded-xl border border-border/70 bg-slate-50/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary/80">Identidad</p>
                    <p><strong>Nombre:</strong> {createDraft.name.trim() || "Sin completar"}</p>
                    <p><strong>Categoría:</strong> {createDraft.category.trim() || "Sin completar"}</p>
                    <p><strong>Familia:</strong> {createDraft.family.trim() || "Sin completar"}</p>
                    <p><strong>Variante:</strong> {createDraft.variant_label.trim() || "No aplica"}</p>
                    <p><strong>Tamaño:</strong> {createDraft.size_label.trim() || "No aplica"}</p>
                    <p><strong>Material:</strong> {createDraft.material.trim() || "No aplica"}</p>
                    <p><strong>ID interno (preview):</strong> {createSkuPreview?.id_preview || "Aún no generado"}</p>
                    <p><strong>SKU:</strong> {createSkuPreviewValue || "Aún no generado"}</p>
                    <p><strong>Publicar al agente NOVA:</strong> {createDraft.publication_mode === "nova" ? "True" : "False"}</p>
                  </div>

                  <div className="space-y-1 rounded-xl border border-border/70 bg-slate-50/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary/80">Precio y reglas</p>
                    <p><strong>Modalidad:</strong> {getFriendlyPricingModeLabel(createDraft.pricing_mode)}</p>
                    <p><strong>Precio fijo:</strong> {createDraft.price_crc.trim() || "No aplica"}</p>
                    <p><strong>Precio base de rangos:</strong> {createDraft.price_from_crc.trim() || "No aplica"}</p>
                    <p><strong>Rangos estructurales:</strong> {createDraft.range_prices.length}</p>
                    {createDraft.pricing_mode === "variable" ? (
                      <p><strong>Cotización automática:</strong> Revisión manual requerida</p>
                    ) : null}
                    <p><strong>Cantidad mínima:</strong> {createDraft.min_qty.trim() || "Sin completar"}</p>
                    <p><strong>Activo:</strong> {createDraft.is_active ? "Sí" : "No"}</p>
                    <p><strong>Permite descuento:</strong> {createDraft.is_discountable ? "Sí" : "No"}</p>
                    <p><strong>Visibilidad descuento:</strong> {getFriendlyDiscountVisibilityLabel(createDraft.discount_visibility)}</p>
                    <p><strong>Permite personalizar nombre:</strong> {createDraft.allows_name ? "Sí" : "No"}</p>
                    <p><strong>Requiere aprobación de diseño:</strong> {createDraft.requires_design_approval ? "Sí" : "No"}</p>
                  </div>

                  <div className="space-y-2 rounded-xl border border-border/70 bg-slate-50/60 p-3 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary/80">Contenido para NOVA</p>
                    <p><strong>Resumen:</strong> {createDraft.summary.trim() || "Sin completar"}</p>
                    <p><strong>Detalle:</strong> {createDraft.details.trim() || "Sin completar"}</p>
                    <div>
                      <p><strong>Términos de búsqueda:</strong></p>
                      {createDraftParsedSearchTerms.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {createDraftParsedSearchTerms.map((term) => (
                            <span key={`detail-term:${term}`} className="rounded-full border border-border bg-white px-2 py-0.5 text-xs">
                              {term}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Sin términos cargados.</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {showCreateHelpPopup ? (
            <div
              className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4"
              onMouseDown={onCreateHelpBackdropMouseDown}
            >
              <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_48px_-24px_rgba(2,6,23,0.35)]">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-lg font-semibold text-slate-900">Guía: Nuevo Producto</h4>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateHelpPopup(false)}>
                    Cerrar
                  </Button>
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <p><strong>Identidad (nombre, categoría y familia):</strong> Define la base comercial del producto. Usa nombres claros y consistentes para facilitar búsqueda y reportes.</p>
                  <p><strong>Variante, tamaño y material:</strong> Agrega diferenciadores reales (ej. color, capacidad, medida o acabado). Si no aplican, déjalos vacíos para evitar ruido.</p>
                  <p><strong>SKU autogenerado:</strong> El sistema lo crea automáticamente según la información seleccionada. No necesitas editarlo manualmente.</p>
                  <p><strong>Si el SKU no se puede generar:</strong> Revisa categoría y familia. El formulario mostrará una advertencia hasta que la combinación sea válida.</p>
                  <p><strong>Modalidad de precio (cómo elegir):</strong> Usa `Precio fijo` cuando siempre vendes al mismo monto (ej. ₡3,500). Usa `Precio por rangos` cuando tienes un precio base de entrada y además estructuras tramos por cantidad. Usa `Precio variable` cuando la cotización será manual.</p>
                  <p><strong>Campos de precio en el formulario:</strong> En `Precio por rangos` debes completar `precio base de rangos` y construir al menos un tramo estructural (min, max opcional, precio unitario). En `Precio fijo` o `Precio variable` no se usan rangos estructurales.</p>
                  <p><strong>Cantidad mínima:</strong> Define el mínimo real de venta (ej. 1, 6, 12) según tu operación.</p>
                  <p><strong>Reglas comerciales:</strong> `Activo` permite operar/publicar. `Permite descuento` habilita la visibilidad del descuento. `Permite personalizar nombre` y `Requiere aprobación de diseño` deben reflejar el flujo real del producto.</p>
                  <p><strong>Resumen vs Detalle:</strong> `Resumen` es una frase corta de alto impacto (qué es y para qué sirve). `Detalle` amplía la información con características, usos y beneficios.</p>
                  <p><strong>Ejemplo Resumen:</strong> &quot;Vaso plástico personalizable para eventos y promociones.&quot;</p>
                  <p><strong>Ejemplo Detalle:</strong> &quot;Vaso de 16oz en plástico resistente, ideal para bebidas frías. Permite personalización con logo y nombre. Recomendado para eventos corporativos y cumpleaños.&quot;</p>
                  <p><strong>Términos de búsqueda:</strong> Escríbelos separados por coma, como los buscaría un cliente (ej. &quot;vaso personalizado, vaso 16oz, vaso para eventos&quot;).</p>
                  <p><strong>Ejemplo rápido:</strong> Nombre: &quot;Vaso personalizado 16oz&quot;; categoría: &quot;vasos&quot;; familia: &quot;vasos_personalizados&quot;; modalidad: `Precio fijo`; precio: 3500; mínimo: 6; resumen: &quot;Vaso plástico personalizable para eventos&quot;; términos: &quot;vaso personalizado, vaso 16oz, vaso evento&quot;.</p>
                  <p><strong>Publicación al agente:</strong> Usa el selector `Publicar al agente NOVA` con valores `True/False`. `True` intenta publicar al agente; `False` guarda como interno.</p>
                </div>
              </section>
            </div>
          ) : null}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-dashed border-amber-300 bg-amber-50/70 p-4 text-sm text-amber-900">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Performance muestra el comportamiento comercial real de cada producto. Si algún
            indicador todavía no está disponible, se verá como N/D hasta contar con información suficiente.
          </p>
        </div>
      </section>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
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
  useSaveProduct,
  useProductsCatalog,
  useProductsPerformance,
} from "@/hooks";
import { Button } from "@/components/ui/button";
import { StateDisplay, TableEmptyStateRow } from "@/components/ui/state-display";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrencyCRC, formatDateTime } from "@/lib/formatters";
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
  search_terms_raw: string;
  publication_mode: "internal" | "nova";
  pricing_mode: ProductPricingMode;
  price_crc: string;
  price_from_crc: string;
  min_qty: string;
  is_active: boolean;
  is_agent_visible: boolean;
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
  search_terms_raw: "",
  publication_mode: "internal",
  pricing_mode: "fixed",
  price_crc: "",
  price_from_crc: "",
  min_qty: "1",
  is_active: true,
  is_agent_visible: false,
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

const supabaseProjectUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/g, "");

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

function getPrimaryImage(product: ProductDetail) {
  const primaryFromTable = product.images.find((image) => image.is_primary);

  if (primaryFromTable) {
    return {
      storage_bucket: primaryFromTable.storage_bucket,
      storage_path: primaryFromTable.storage_path,
      alt_text: primaryFromTable.alt_text,
    };
  }

  if (product.search_meta.storage_bucket && product.search_meta.storage_path) {
    return {
      storage_bucket: product.search_meta.storage_bucket,
      storage_path: product.search_meta.storage_path,
      alt_text: product.search_meta.alt_text,
    };
  }

  return {
    storage_bucket: null,
    storage_path: null,
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
    lower.includes("cannot remain agent-visible") ||
    lower.includes("no se puede publicar al agente") ||
    lower.includes("no publicable para nova")
  ) {
    return "Este producto todavia no esta listo para publicarse en NOVA.";
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

  if (product.pricing_mode === "from") {
    return product.price_from_crc;
  }

  return product.price_crc ?? product.price_from_crc;
}

function getPriceModeLabel(pricingMode: ProductPricingMode) {
  if (pricingMode === "fixed") {
    return "fixed";
  }

  if (pricingMode === "from") {
    return "from";
  }

  return "variable";
}

function getFormattedPrice(product: ProductPriceShape) {
  const value = getPriceValue(product);

  if (value == null) {
    return "Sin precio usable";
  }

  if (product.pricing_mode === "from") {
    return `Desde ${formatCurrencyCRC(value)}`;
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
      blockingIssues.push("Este modo de precio no admite precio desde.");
    }
  } else if (product.pricing_mode === "from") {
    if (product.price_from_crc == null) {
      blockingIssues.push("Falta el precio desde para este modo de precio.");
    }
    if (product.price_crc != null) {
      blockingIssues.push("Este modo de precio no admite precio fijo.");
    }
  } else if (product.pricing_mode === "variable") {
    if (product.price_crc == null) {
      blockingIssues.push("Falta el precio base para precio variable.");
    }
    if (product.price_from_crc != null) {
      blockingIssues.push("Precio variable no admite precio desde.");
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
    (product.pricing_mode === "from" && product.price_from_crc != null) ||
    (product.pricing_mode === "variable" &&
      (product.price_crc != null || product.price_from_crc != null));

  if (!hasUsablePrice) {
    alerts.push("Sin precio usable");
  }

  const hasPricingModeMismatch =
    (product.pricing_mode === "fixed" && product.price_crc == null) ||
    (product.pricing_mode === "from" && product.price_from_crc == null);

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
      alt_text: row.primary_image_alt,
      exact_match: false,
      direct_match: false,
      match_quality: "weak",
      score: 0,
    },
    discount_rules: [],
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

  return {
    core: toUpdatePayload(product),
    search_meta: {
      aliases: normalizeAliasTokens(aliasesSource),
      search_terms: normalizedSearchTerms,
    },
    images: normalizedImages,
  };
}

function validateProductPayloadForSave(payload: UpdateProductInput): string | null {
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
    return "Este tipo de precio no admite precio desde.";
  }
  if (pricingMode === "from" && payload.price_from_crc == null) {
    return "Completa el precio desde para continuar.";
  }
  if (pricingMode === "from" && payload.price_crc != null) {
    return "Este tipo de precio no admite precio fijo.";
  }
  if (pricingMode === "variable" && payload.price_crc == null) {
    return "Completa el precio base para precio variable.";
  }
  if (pricingMode === "variable" && payload.price_from_crc != null) {
    return "Precio variable no admite precio desde.";
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
    return "Este tipo de precio no admite precio desde.";
  }
  if (draft.pricing_mode === "from" && priceFrom == null) {
    return "Completa el precio desde para continuar.";
  }
  if (draft.pricing_mode === "from" && price != null) {
    return "Este tipo de precio no admite precio fijo.";
  }
  if (draft.pricing_mode === "variable" && price == null) {
    return "Completa el precio base para precio variable.";
  }
  if (draft.pricing_mode === "variable" && priceFrom != null) {
    return "Precio variable no admite precio desde.";
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
    pricing_mode: draft.pricing_mode,
    price_crc: toDecimalOrNull(draft.price_crc),
    price_from_crc: toDecimalOrNull(draft.price_from_crc),
    min_qty: toNumberOrNull(draft.min_qty) ?? 1,
    is_active: draft.is_active,
    is_agent_visible: false,
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
  const values = points.map((point) =>
    metric === "units" ? point.units_sold : point.revenue_crc,
  );
  const maxValue = Math.max(...values, 1);

  const chartPoints = values
    .map((value, index) => {
      const x = values.length <= 1 ? 0 : (index / (values.length - 1)) * 100;
      const y = 100 - (value / maxValue) * 100;
      return `${x},${y}`;
    })
    .join(" ");

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
      </svg>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {points.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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
    storage_bucket: "mwl-products",
    storage_path: "",
    alt_text: "",
    is_primary: false,
    sort_order: "",
  });
  const [newSearchTermDraft, setNewSearchTermDraft] = useState({
    term: "",
    priority: "100",
    is_active: true,
    notes: "",
  });
  const [searchMetaMessage, setSearchMetaMessage] = useState<string | null>(null);
  const [thumbnailLoadErrors, setThumbnailLoadErrors] = useState<Record<string, boolean>>({});
  const [tempIdSeed, setTempIdSeed] = useState(-1);

  const { saveProduct, isPending: isSavingProduct } = useSaveProduct();

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
    () => (selectedProduct ? getPrimaryImage(selectedProduct) : { storage_bucket: null, storage_path: null, alt_text: null }),
    [selectedProduct],
  );
  const selectedPrimaryImageSrc = useMemo(
    () =>
      buildStoragePublicUrl(selectedPrimaryImage.storage_bucket, selectedPrimaryImage.storage_path),
    [selectedPrimaryImage.storage_bucket, selectedPrimaryImage.storage_path],
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
      ? validateProductPayloadForSave(selectedProductEditablePayload)
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
      newImageDraft.storage_path.trim() ||
      newImageDraft.alt_text.trim() ||
      newImageDraft.sort_order.trim() ||
      newImageDraft.is_primary ||
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
    setNewImageDraft({
      storage_bucket: "mwl-products",
      storage_path: "",
      alt_text: "",
      is_primary: false,
      sort_order: "",
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

  const createPreviewSku = useMemo(() => {
    const normalizePreviewToken = (value: string) =>
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

    const skuChunks = [
      createDraft.category,
      createDraft.family,
      createDraft.name,
      createDraft.variant_label,
    ]
      .map(normalizePreviewToken)
      .filter(Boolean)
      .map((chunk) => chunk.slice(0, 3).toUpperCase());

    return skuChunks.length > 0 ? `MWL-${skuChunks.join("-")}` : "MWL-";
  }, [createDraft.category, createDraft.family, createDraft.name, createDraft.variant_label]);
  const createDraftNovaValidation = useMemo(
    () => validateCreateDraftForNova(createDraft),
    [createDraft],
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
    setEditBaseline(snapshot);
    setEditDraft(snapshot);
    setCatalogTab("general");
    setSaveStatusMessage(null);
    setSaveFeedbackItems([]);
    setSearchMetaMessage(null);
    setNewAlias("");
    setNewImageDraft({
      storage_bucket: "mwl-products",
      storage_path: "",
      alt_text: "",
      is_primary: false,
      sort_order: "",
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
    setNewImageDraft({
      storage_bucket: "mwl-products",
      storage_path: "",
      alt_text: "",
      is_primary: false,
      sort_order: "",
    });
    setNewSearchTermDraft({
      term: "",
      priority: "100",
      is_active: true,
      notes: "",
    });
  }

  const requestCloseEditModal = useCallback(() => {
    if (!hasUnsavedChanges) {
      resetEditModalState();
      return;
    }

    setPendingSelectedProductId(null);
    setPendingMode(null);
    setIsDiscardChangesOpen(true);
  }, [hasUnsavedChanges]);

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
    if (!isEditOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestCloseEditModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditOpen, requestCloseEditModal]);

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
    setCreateFeedbackItems([]);
    setCreateStatusMessage("Creando producto...");

    try {
      const searchableTerms = createDraftNovaValidation.usableSearchTerms.map((term) => ({
        term,
        term_type: "alias" as const,
        priority: 100,
        is_active: true,
      }));

      const saveResult = await saveProduct({
        input: {
          product: payload,
          publication_mode: wantsNovaPublication ? "nova" : "internal",
          search_terms: searchableTerms,
          aliases: [],
          images: [],
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

      const normalizedImages = editDraft.images
        .map((image) => ({
          id: image.id > 0 ? image.id : null,
          storage_bucket: image.storage_bucket,
          storage_path: image.storage_path.trim(),
          alt_text: image.alt_text ?? null,
          is_primary: image.is_primary,
          sort_order: image.sort_order,
        }))
        .filter((image) => image.storage_path.length > 0);

      const saveResult = await saveProduct({
        input: {
          product_id: selectedProductId,
          product: corePayload,
          publication_mode: publicationMode,
          aliases: normalizedAliases,
          search_terms: normalizedSearchTerms,
          images: normalizedImages,
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
    if (!editDraft || !newImageDraft.storage_path.trim()) {
      return;
    }

    const nextTempId = tempIdSeed;
    const nextSortOrder = toNumberOrNull(newImageDraft.sort_order) ?? editDraft.images.length;
    setTempIdSeed((current) => current - 1);

    setEditDraft((current) =>
      current
        ? {
            ...current,
            images: [
              ...current.images.map((image) =>
                newImageDraft.is_primary ? { ...image, is_primary: false } : image,
              ),
              {
                id: nextTempId,
                product_id: current.id,
                storage_bucket: newImageDraft.storage_bucket.trim() || "mwl-products",
                storage_path: newImageDraft.storage_path.trim(),
                alt_text: newImageDraft.alt_text.trim() || null,
                is_primary: newImageDraft.is_primary,
                sort_order: nextSortOrder,
                created_at: new Date().toISOString(),
              },
            ],
          }
        : current,
    );
    setNewImageDraft({
      storage_bucket: "mwl-products",
      storage_path: "",
      alt_text: "",
      is_primary: false,
      sort_order: "",
    });
    setSearchMetaMessage("Imagen agregada al draft");
  }

  async function handleTogglePrimaryImage(imageId: number, isPrimary: boolean) {
    if (!editDraft) {
      return;
    }

    setEditDraft((current) =>
      current
        ? {
            ...current,
            images: current.images.map((image) => {
              if (image.id === imageId) {
                return { ...image, is_primary: !isPrimary };
              }

              return !isPrimary ? { ...image, is_primary: false } : image;
            }),
          }
        : current,
    );
    setSearchMetaMessage("Imagen actualizada en draft");
  }

  async function handleUpdateImageAlt(imageId: number, altText: string) {
    if (!editDraft) {
      return;
    }

    setEditDraft((current) =>
      current
        ? {
            ...current,
            images: current.images.map((image) =>
              image.id === imageId ? { ...image, alt_text: altText || null } : image,
            ),
          }
        : current,
    );
    setSearchMetaMessage("alt_text actualizado en draft");
  }

  async function handleUpdateImageSort(imageId: number, sortOrder: number) {
    if (!editDraft) {
      return;
    }

    setEditDraft((current) =>
      current
        ? {
            ...current,
            images: current.images.map((image) =>
              image.id === imageId ? { ...image, sort_order: sortOrder } : image,
            ),
          }
        : current,
    );
    setSearchMetaMessage("Orden de imagen actualizado en draft");
  }

  async function handleDeleteImage(imageId: number) {
    if (!editDraft) {
      return;
    }

    setEditDraft((current) =>
      current
        ? { ...current, images: current.images.filter((image) => image.id !== imageId) }
        : current,
    );
    setSearchMetaMessage("Imagen eliminada del draft");
  }

  return (
    <div className="space-y-8">
      <div className="space-y-6 rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <PageHeader
            title="Products"
            description="Catalog conectado a datos reales de mwl_products para lectura operativa y control de integridad."
          />
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
            <label className="relative w-full md:min-w-[360px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar por id, sku, nombre, family, category o aliases"
                className="h-11 w-full rounded-2xl border border-border bg-white pl-11 pr-4 text-sm text-slate-950 outline-none transition focus:border-primary"
              />
            </label>
            <Button
              type="button"
              className="gap-2"
              onClick={() => {
                setCreateStatusMessage(null);
                setCreateFeedbackItems([]);
                setIsCreateOpen(true);
              }}
            >
              + Nuevo producto
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
                Catalog
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
                <option value="all">Category: todas</option>
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
                <option value="all">Family: todas</option>
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
                <option value="all">Pricing: todos</option>
                <option value="fixed">fixed</option>
                <option value="from">from</option>
                <option value="variable">variable</option>
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
                <option value="none">Mas filtros</option>
                <option value="integrity_alerts">Solo alertas de integridad</option>
                <option value="high_boost">Solo search_boost alto</option>
              </select>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowAdvancedSearch((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 transition hover:bg-slate-50"
            >
              Filtros de busqueda avanzada
              {showAdvancedSearch ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showAdvancedSearch ? (
              <div className="mt-3 grid gap-3 rounded-2xl border border-border/70 bg-slate-50/70 p-4 sm:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    category
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
                    max_price_crc
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
                    min_qty
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
                    exact_product_id
                  </span>
                  <input
                    value={filters.exact_product_id}
                    onChange={(event) =>
                      setFilters((current) => ({ ...current, exact_product_id: event.target.value }))
                    }
                    placeholder="Ej: bag_confitero_20x25_std"
                    className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                  />
                </label>

                <div className="sm:col-span-2 xl:col-span-4">
                  <p className="text-xs leading-5 text-muted-foreground">
                    Los filtros de esta vista se envian al backend real para consulta en
                    `mwl_products_with_primary_image`.
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
                      <th className="px-3 py-3">Categoria / Family</th>
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
                      const thumbnailSrc = buildStoragePublicUrl(
                        row.primary_image_bucket,
                        row.primary_image_path,
                      );
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
                        description="Ajusta query, category, min_qty o exact_product_id para volver a ver resultados."
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
                        Product detail
                      </p>
                      <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                        {selectedProductBase.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">{selectedProductBase.id}</p>
                      {selectedProductBase.ui_created_locally ? (
                        <StatusBadge tone="warning" className="mt-2">
                          Draft local UI
                        </StatusBadge>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-border/70 bg-slate-50/70 p-3">
                        <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">SKU</p>
                        <p className="mt-1 text-sm font-medium text-slate-950">{selectedProductBase.sku}</p>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-slate-50/70 p-3">
                        <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Categoria / Family</p>
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
                      <p className="text-sm text-slate-900">{selectedProductBase.summary ?? "Sin summary."}</p>
                      <p className="text-sm text-slate-700">{selectedProductBase.details ?? "Sin details."}</p>
                      <p className="text-xs text-muted-foreground">{selectedProductBase.notes ?? "Sin notes."}</p>
                    </div>

                    <div className="space-y-2 rounded-2xl border border-border/70 bg-slate-50/70 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Busqueda y multimedia
                      </p>
                      <p className="text-sm text-slate-800">
                        aliases: {selectedProductBase.search_meta.alias_entries.length}
                      </p>
                      <p className="text-sm text-slate-800">
                        search_terms: {selectedProductBase.search_meta.search_terms.length}
                      </p>
                      <p className="text-sm text-slate-800">imagenes: {selectedProductBase.images.length}</p>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-slate-50/70 p-3">
                      <p className="text-xs text-muted-foreground">
                        Vista solo lectura. Edita desde modal para aplicar cambios de forma controlada.
                      </p>
                      <Button type="button" onClick={openEditModal}>
                        Editar producto
                      </Button>
                    </div>

                    {isEditOpen && selectedProduct ? (
                      <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-[2px]"
                        onMouseDown={(event) => {
                          if (event.target === event.currentTarget) {
                            requestCloseEditModal();
                          }
                        }}
                      >
                        <section
                          className="flex h-[76vh] w-full max-w-4xl flex-col rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.18)]"
                          onMouseDown={(event) => event.stopPropagation()}
                        >
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
                            </div>
                            {selectedPrimaryImageSrc ? (
                              <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-border/70 bg-slate-100">
                                {!thumbnailLoadErrors[`edit-header:${selectedProduct.id}:${selectedPrimaryImageSrc}`] ? (
                                  <Image
                                    src={selectedPrimaryImageSrc}
                                    alt={selectedPrimaryImage.alt_text ?? `Imagen ${selectedProduct.name}`}
                                    fill
                                    sizes="96px"
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

                          <div className="mt-4 space-y-3">
                            {editNovaOperationalAssessment ? (
                              <div className="rounded-2xl border border-border/70 bg-slate-50/80 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary/70">
                                    Estado operativo NOVA
                                  </p>
                                  <StatusBadge tone={editNovaOperationalAssessment.statusTone}>
                                    {editNovaOperationalAssessment.statusLabel}
                                  </StatusBadge>
                                </div>
                                <p className="mt-2 text-xs text-muted-foreground">
                                  Search terms activos: {editNovaOperationalAssessment.activeDiscoveryTerms}
                                </p>
                                <FeedbackList items={editOperationalFeedback} className="mt-2" />
                              </div>
                            ) : null}

                          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-slate-50/70 p-3">
                            <p className="text-xs text-muted-foreground">
                              {editNovaContractError ??
                                (localValidationError
                                  ? toFriendlyOperationalMessage(localValidationError)
                                  : null) ??
                                saveStatusMessage ??
                                "Cambios locales. Nada se guarda hasta presionar Guardar cambios."}
                            </p>
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
                            <FeedbackList items={saveFeedbackItems} />
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
                            <fieldset className="space-y-3">
                              <label className="space-y-1">
                                <span className="text-xs text-muted-foreground">name</span>
                                <input
                                  value={selectedProduct?.name ?? ""}
                                  onChange={(event) =>
                                    updateSelectedProductField("name", event.target.value)
                                  }
                                  className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                                />
                              </label>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <label className="space-y-1">
                                  <span className="text-xs text-muted-foreground">category</span>
                                  <input
                                    value={selectedProduct?.category ?? ""}
                                    onChange={(event) =>
                                      updateSelectedProductField("category", event.target.value)
                                    }
                                    className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-xs text-muted-foreground">family</span>
                                  <input
                                    value={selectedProduct?.family ?? ""}
                                    onChange={(event) =>
                                      updateSelectedProductField("family", event.target.value)
                                    }
                                    className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                                  />
                                </label>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <label className="space-y-1">
                                  <span className="text-xs text-muted-foreground">variant_label</span>
                                  <input
                                    value={selectedProduct?.variant_label ?? ""}
                                    onChange={(event) =>
                                      updateSelectedProductField(
                                        "variant_label",
                                        event.target.value || null,
                                      )
                                    }
                                    className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-xs text-muted-foreground">size_label</span>
                                  <input
                                    value={selectedProduct?.size_label ?? ""}
                                    onChange={(event) =>
                                      updateSelectedProductField(
                                        "size_label",
                                        event.target.value || null,
                                      )
                                    }
                                    className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-xs text-muted-foreground">material</span>
                                  <input
                                    value={selectedProduct?.material ?? ""}
                                    onChange={(event) =>
                                      updateSelectedProductField("material", event.target.value || null)
                                    }
                                    className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-xs text-muted-foreground">base_color</span>
                                  <input
                                    value={selectedProduct?.base_color ?? ""}
                                    onChange={(event) =>
                                      updateSelectedProductField("base_color", event.target.value || null)
                                    }
                                    className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                                  />
                                </label>
                              </div>
                              <label className="space-y-1">
                                <span className="text-xs text-muted-foreground">summary</span>
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
                                <span className="text-xs text-muted-foreground">details</span>
                                <textarea
                                  value={selectedProduct?.details ?? ""}
                                  onChange={(event) =>
                                    updateSelectedProductField("details", event.target.value || null)
                                  }
                                  rows={3}
                                  className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-primary"
                                />
                              </label>
                              <div className="space-y-2 rounded-2xl border border-border/70 bg-slate-50/80 p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                    Search terms para NOVA
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
                                    placeholder="Agregar search term"
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
                                      Sin search terms. Agrega al menos uno para mantener publicable en NOVA.
                                    </p>
                                  )}
                                </div>
                              </div>
                              <label className="space-y-1">
                                <span className="text-xs text-muted-foreground">notes</span>
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
                          <span className="text-xs text-muted-foreground">pricing_mode</span>
                          <select
                            value={selectedProduct.pricing_mode}
                            onChange={(event) =>
                              updateSelectedProductField(
                                "pricing_mode",
                                event.target.value as ProductPricingMode,
                              )
                            }
                            className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                          >
                            <option value="fixed">fixed</option>
                            <option value="from">from</option>
                            <option value="variable">variable</option>
                          </select>
                        </label>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="space-y-1">
                            <span className="text-xs text-muted-foreground">price_crc</span>
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
                          <label className="space-y-1">
                            <span className="text-xs text-muted-foreground">price_from_crc</span>
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
                          <label className="space-y-1">
                            <span className="text-xs text-muted-foreground">min_qty</span>
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
                            <span className="text-xs text-muted-foreground">discount_visibility</span>
                            <select
                              value={selectedProduct.discount_visibility}
                              onChange={(event) =>
                                updateSelectedProductField(
                                  "discount_visibility",
                                  event.target.value as ProductDetail["discount_visibility"],
                                )
                              }
                              className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                            >
                              <option value="never">never</option>
                              <option value="only_if_customer_requests">
                                only_if_customer_requests
                              </option>
                              <option value="internal_only">internal_only</option>
                              <option value="always">always</option>
                            </select>
                          </label>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="inline-flex items-center gap-2 text-sm text-slate-800">
                            <input
                              type="checkbox"
                              checked={selectedProduct.is_discountable}
                              onChange={(event) =>
                                updateSelectedProductField(
                                  "is_discountable",
                                  event.target.checked,
                                )
                              }
                            />
                            is_discountable
                          </label>
                          <label className="inline-flex items-center gap-2 text-sm text-slate-800">
                            <input
                              type="checkbox"
                              checked={selectedProduct.is_premium}
                              onChange={(event) =>
                                updateSelectedProductField("is_premium", event.target.checked)
                              }
                            />
                            is_premium
                          </label>
                          <label className="inline-flex items-center gap-2 text-sm text-slate-800">
                            <input
                              type="checkbox"
                              checked={selectedProduct.is_full_color}
                              onChange={(event) =>
                                updateSelectedProductField("is_full_color", event.target.checked)
                              }
                            />
                            is_full_color
                          </label>
                        </div>
                      </fieldset>
                    ) : null}

                    {catalogTab === "busqueda" ? (
                      <fieldset className="min-w-0 space-y-3">
                        <div className="rounded-2xl border border-border/70 bg-slate-50/80 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            aliases
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
                              <p className="text-sm text-muted-foreground">Sin aliases cargados.</p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border/70 bg-slate-50/80 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            search terms
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
                              placeholder="term"
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
                              placeholder="priority"
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
                                      placeholder="Sin notas. Agrega contexto opcional para este termino."
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
                                      activo
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
                              <p className="text-muted-foreground">Sin search_terms del producto.</p>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="space-y-1">
                            <span className="text-xs text-muted-foreground">search_boost</span>
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
                            <span className="text-xs text-muted-foreground">source_type</span>
                            <input
                              value={selectedProduct.source_type}
                              readOnly
                              className="h-10 w-full rounded-xl border border-border bg-slate-100 px-3 text-sm text-slate-700"
                            />
                          </label>
                        </div>

                        <label className="space-y-1">
                          <span className="text-xs text-muted-foreground">source_ref</span>
                          <input
                            value={selectedProduct.source_ref ?? ""}
                            readOnly
                            className="h-10 w-full rounded-xl border border-border bg-slate-100 px-3 text-sm text-slate-700"
                          />
                        </label>

                        <div className="flex flex-wrap gap-2">
                          <StatusBadge tone={selectedProduct.search_meta.exact_match ? "success" : "neutral"}>
                            exact_match: {selectedProduct.search_meta.exact_match ? "true" : "false"}
                          </StatusBadge>
                          <StatusBadge tone={selectedProduct.search_meta.direct_match ? "info" : "neutral"}>
                            direct_match: {selectedProduct.search_meta.direct_match ? "true" : "false"}
                          </StatusBadge>
                          <StatusBadge>match_quality: {selectedProduct.search_meta.match_quality}</StatusBadge>
                          <StatusBadge>score: {selectedProduct.search_meta.score.toFixed(2)}</StatusBadge>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {searchMetaMessage ??
                            "Cambios de aliases/search_terms persisten en tablas reales y refrescan el indice de busqueda."}
                        </p>
                      </fieldset>
                    ) : null}

                    {catalogTab === "multimedia" ? (
                      <div className="min-w-0 space-y-3">
                        <div className="rounded-2xl border border-border/70 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Primary image
                          </p>
                          {selectedProduct.search_meta.storage_bucket &&
                          selectedProduct.search_meta.storage_path ? (
                            <div className="mt-3 space-y-1 text-sm text-slate-800">
                              <p className="break-all">
                                primary_image_bucket: {selectedProduct.search_meta.storage_bucket}
                              </p>
                              <p className="break-all">
                                primary_image_path: {selectedProduct.search_meta.storage_path}
                              </p>
                              <p className="break-all">
                                primary_image_alt: {selectedProduct.search_meta.alt_text ?? "Sin alt_text"}
                              </p>
                            </div>
                          ) : (
                            <p className="mt-3 text-sm text-muted-foreground">Sin imagen primaria registrada.</p>
                          )}
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            mwl_product_images
                          </p>
                          <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                            <input
                              value={newImageDraft.storage_bucket}
                              onChange={(event) =>
                                setNewImageDraft((current) => ({
                                  ...current,
                                  storage_bucket: event.target.value,
                                }))
                              }
                              placeholder="bucket"
                              className="h-10 w-full min-w-0 rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                            />
                            <input
                              value={newImageDraft.storage_path}
                              onChange={(event) =>
                                setNewImageDraft((current) => ({
                                  ...current,
                                  storage_path: event.target.value,
                                }))
                              }
                              placeholder="storage_path"
                              className="h-10 w-full min-w-0 rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                            />
                            <input
                              value={newImageDraft.alt_text}
                              onChange={(event) =>
                                setNewImageDraft((current) => ({
                                  ...current,
                                  alt_text: event.target.value,
                                }))
                              }
                              placeholder="alt_text"
                              className="h-10 w-full min-w-0 rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                            />
                            <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                              <input
                                value={newImageDraft.sort_order}
                                onChange={(event) =>
                                  setNewImageDraft((current) => ({
                                    ...current,
                                    sort_order: event.target.value,
                                  }))
                                }
                                placeholder="sort"
                                inputMode="numeric"
                                className="h-10 w-full min-w-0 rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleAddImage}
                                disabled={!newImageDraft.storage_path.trim() || isSavingProduct}
                                className="w-full sm:w-auto sm:shrink-0"
                              >
                                Agregar
                              </Button>
                            </div>
                          </div>
                          <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-700">
                            <input
                              type="checkbox"
                              checked={newImageDraft.is_primary}
                              onChange={(event) =>
                                setNewImageDraft((current) => ({
                                  ...current,
                                  is_primary: event.target.checked,
                                }))
                              }
                            />
                            marcar como primaria
                          </label>
                          <div className="mt-3 space-y-2 text-sm">
                            {selectedProduct.images.length > 0 ? (
                              selectedProduct.images.map((image) => (
                                <div key={image.id} className="rounded-xl bg-white px-3 py-2">
                                  <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                                    <div className="min-w-0 space-y-1">
                                      <p className="break-all">{image.storage_bucket}</p>
                                      <p className="break-all text-xs text-muted-foreground">
                                        {image.storage_path}
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 sm:justify-end">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleTogglePrimaryImage(image.id, image.is_primary)}
                                        disabled={isSavingProduct}
                                      >
                                        {image.is_primary ? "Quitar primaria" : "Marcar primaria"}
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleDeleteImage(image.id)}
                                        disabled={isSavingProduct}
                                      >
                                        Eliminar
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="mt-2 grid min-w-0 gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] sm:items-center">
                                    <input
                                      defaultValue={image.alt_text ?? ""}
                                      onBlur={(event) => {
                                        const nextAlt = event.target.value.trim();
                                        if (nextAlt !== (image.alt_text ?? "")) {
                                          void handleUpdateImageAlt(image.id, nextAlt);
                                        }
                                      }}
                                      placeholder="alt_text"
                                      className="h-9 w-full min-w-0 rounded-lg border border-border bg-white px-2 text-xs text-slate-950 outline-none transition focus:border-primary"
                                    />
                                    <input
                                      defaultValue={String(image.sort_order)}
                                      onBlur={(event) => {
                                        const sortOrder = toNumberOrNull(event.target.value);
                                        if (sortOrder != null && sortOrder !== image.sort_order) {
                                          void handleUpdateImageSort(image.id, sortOrder);
                                        }
                                      }}
                                      inputMode="numeric"
                                      placeholder="sort_order"
                                      className="h-9 w-full min-w-0 rounded-lg border border-border bg-white px-2 text-xs text-slate-950 outline-none transition focus:border-primary"
                                    />
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {image.is_primary ? "primary" : "secondary"} · creado{" "}
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
                            "Si eliminas la primaria y quedan imagenes, se promueve automaticamente la de menor sort_order."}
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
                            allows_name
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
                            extra_adjustment_has_cost
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
                            requires_design_approval
                          </label>
                          <label className="inline-flex items-center gap-2 text-sm text-slate-800">
                            <input
                              type="checkbox"
                              checked={selectedProduct.is_active}
                              onChange={(event) =>
                                updateSelectedProductField("is_active", event.target.checked)
                              }
                            />
                            is_active
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
                            is_agent_visible
                          </label>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="space-y-1">
                            <span className="text-xs text-muted-foreground">
                              includes_design_adjustment_count
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
                            <span className="text-xs text-muted-foreground">sort_order</span>
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
                            Habilitar edicion controlada de sku
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
                          <span className="text-xs text-muted-foreground">source_type</span>
                          <input
                            value={selectedProduct.source_type}
                            readOnly
                            className="h-10 w-full rounded-xl border border-border bg-slate-100 px-3 text-sm text-slate-700"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs text-muted-foreground">source_ref</span>
                          <input
                            value={selectedProduct.source_ref ?? ""}
                            readOnly
                            className="h-10 w-full rounded-xl border border-border bg-slate-100 px-3 text-sm text-slate-700"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs text-muted-foreground">updated_at</span>
                          <input
                            value={formatDateTime(selectedProduct.updated_at)}
                            readOnly
                            className="h-10 w-full rounded-xl border border-border bg-slate-100 px-3 text-sm text-slate-700"
                          />
                        </label>
                      </div>
                          ) : null}
                          </div>
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-[2px]">
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

      {isCreateOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
                NUEVO PRODUCTO
              </p>
              <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                Agrega un producto a tu catálogo
              </h3>
              <p className="text-sm text-muted-foreground">
                Flujo de publicación NOVA: crea interno o publica al agente solo cuando cumple el contrato.
              </p>
            </div>

            <div className="mt-5 max-h-[64vh] space-y-5 overflow-y-auto pr-1">
              <section className="rounded-2xl border border-border/70 bg-slate-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary/70">
                    Estado de Preparacion
                  </p>
                  <StatusBadge tone={createDraftNovaValidation.isNovaReady ? "success" : "warning"}>
                    {createDraftNovaValidation.isNovaReady ? "Listo para NOVA" : "Incompleto para NOVA"}
                  </StatusBadge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Publicar al agente requiere summary, search terms con 3+ caracteres alfanumericos y 1+ letra, estado activo y coherencia de variante.
                </p>
              </section>

              <section className="grid gap-4 sm:grid-cols-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary/70 sm:col-span-2">
                  Identidad del producto
                </p>
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
                  <input
                    value={createPreviewSku}
                    readOnly
                    className="h-10 w-full rounded-xl border border-border bg-slate-100 px-3 text-sm text-slate-700 outline-none"
                  />
                </label>
                <SuggestionInput
                  label="Family"
                  value={createDraft.family}
                  options={familyOptions}
                  placeholder="Ej. chip_bags, caminata"
                  createOptionLabel="Crear family"
                  onChange={(nextValue) =>
                    setCreateDraft((current) => ({ ...current, family: nextValue }))
                  }
                />
                <SuggestionInput
                  label="Category"
                  value={createDraft.category}
                  options={categoryOptions}
                  placeholder="Ej. Hogar, Ropa"
                  createOptionLabel="Crear category"
                  onChange={(nextValue) =>
                    setCreateDraft((current) => ({ ...current, category: nextValue }))
                  }
                />
              </section>

              <section className="grid gap-4 sm:grid-cols-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary/70 sm:col-span-2">
                  Precio y reglas comerciales
                </p>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">pricing_mode</span>
                  <select
                    value={createDraft.pricing_mode}
                    onChange={(event) =>
                      setCreateDraft((current) => ({
                        ...current,
                        pricing_mode: event.target.value as ProductPricingMode,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                  >
                    <option value="fixed">fixed</option>
                    <option value="from">from</option>
                    <option value="variable">variable</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">min_qty</span>
                  <input
                    value={createDraft.min_qty}
                    onChange={(event) =>
                      setCreateDraft((current) => ({ ...current, min_qty: event.target.value }))
                    }
                    inputMode="numeric"
                    className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">price_crc</span>
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
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">price_from_crc</span>
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
                <label className="inline-flex items-center gap-2 text-sm text-slate-800">
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
                  is_active
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-800">
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
                  is_discountable
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={createDraft.allows_name}
                    onChange={(event) =>
                      setCreateDraft((current) => ({ ...current, allows_name: event.target.checked }))
                    }
                  />
                  allows_name
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-800">
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
                  requires_design_approval
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">discount_visibility</span>
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
                    <option value="never">never</option>
                    <option value="only_if_customer_requests">only_if_customer_requests</option>
                    <option value="internal_only">internal_only</option>
                    <option value="always">always</option>
                  </select>
                </label>
              </section>

              <section className="grid gap-4 sm:grid-cols-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary/70 sm:col-span-2">
                  Descubrimiento para NOVA
                </p>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">variant_label</span>
                  <input
                    value={createDraft.variant_label}
                    onChange={(event) =>
                      setCreateDraft((current) => ({
                        ...current,
                        variant_label: event.target.value,
                      }))
                    }
                    placeholder="Ej. rosado, premium, edición navidad"
                    className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">size_label</span>
                  <input
                    value={createDraft.size_label}
                    onChange={(event) =>
                      setCreateDraft((current) => ({ ...current, size_label: event.target.value }))
                    }
                    placeholder="Ej. 20x25 cm"
                    className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                  />
                </label>
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-xs text-muted-foreground">summary</span>
                  <textarea
                    value={createDraft.summary}
                    onChange={(event) =>
                      setCreateDraft((current) => ({ ...current, summary: event.target.value }))
                    }
                    rows={2}
                    className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-primary"
                  />
                </label>
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-xs text-muted-foreground">details</span>
                  <textarea
                    value={createDraft.details}
                    onChange={(event) =>
                      setCreateDraft((current) => ({ ...current, details: event.target.value }))
                    }
                    rows={3}
                    className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-primary"
                  />
                </label>
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-xs text-muted-foreground">search terms</span>
                  <textarea
                    value={createDraft.search_terms_raw}
                    onChange={(event) =>
                      setCreateDraft((current) => ({ ...current, search_terms_raw: event.target.value }))
                    }
                    rows={3}
                    placeholder="Ej. bolso infantil, bolso cumpleaños, bolsito personalizado"
                    className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-primary"
                  />
                </label>
              </section>

              <section className="space-y-3 rounded-2xl border border-border/70 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary/70">
                  Publicacion al agente
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCreateDraft((current) => ({ ...current, publication_mode: "internal" }))
                    }
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                      createDraft.publication_mode === "internal"
                        ? "border-slate-950 bg-white text-slate-950"
                        : "border-border bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Guardar como interno
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCreateDraft((current) => ({ ...current, publication_mode: "nova" }))
                    }
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                      createDraft.publication_mode === "nova"
                        ? "border-slate-950 bg-white text-slate-950"
                        : "border-border bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Publicar al agente (NOVA)
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  `is_agent_visible` se decide por el flujo de publicación: interno lo deja en `false`, publicar lo activa solo si cumple NOVA.
                </p>
                <FeedbackList items={createDraftOperationalFeedback} />
              </section>

              <p className="text-xs text-muted-foreground">
                {createStatusMessage ??
                  "El producto se crea primero como interno y, si aplica, se publica al agente al completar validación NOVA."}
              </p>
              <FeedbackList items={createFeedbackItems} />
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false);
                  setCreateStatusMessage(null);
                  setCreateFeedbackItems([]);
                }}
                disabled={isSavingProduct}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={createLocalProduct} disabled={isSavingProduct}>
                {isSavingProduct
                  ? "Creando..."
                  : createDraft.publication_mode === "nova"
                    ? "Crear y publicar al agente"
                    : "Guardar producto interno"}
              </Button>
            </div>
          </div>
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

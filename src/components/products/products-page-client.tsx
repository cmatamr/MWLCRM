"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Ellipsis,
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
  useCreateProduct,
  useProductDetail,
  useProductSearchMedia,
  useProductsCatalog,
  useProductsPerformance,
  useUpdateProduct,
} from "@/hooks";
import { Button } from "@/components/ui/button";
import { StateDisplay, TableEmptyStateRow } from "@/components/ui/state-display";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrencyCRC, formatDateTime } from "@/lib/formatters";
import type {
  CreateProductInput,
  GetProductsPerformanceParams,
  ListCatalogProductsParams,
  ProductDiscountVisibility,
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

const catalogTabs: Array<{ id: CatalogSidebarTab; label: string }> = [
  { id: "general", label: "General" },
  { id: "precios", label: "Precios" },
  { id: "busqueda", label: "Busqueda" },
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
  pricing_mode: "fixed",
  price_crc: "",
  price_from_crc: "",
  min_qty: "1",
  is_active: true,
  is_agent_visible: true,
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

function validateProductPayloadForSave(payload: UpdateProductInput): string | null {
  const name = payload.name?.trim() ?? "";
  if (!name) {
    return "name cannot be empty.";
  }

  const pricingMode = payload.pricing_mode;
  if (!pricingMode) {
    return "pricing_mode is required.";
  }

  if (payload.price_crc != null && payload.price_crc < 0) {
    return "price_crc must be greater than or equal to 0.";
  }
  if (payload.price_from_crc != null && payload.price_from_crc < 0) {
    return "price_from_crc must be greater than or equal to 0.";
  }
  if (payload.min_qty != null && payload.min_qty < 1) {
    return "min_qty must be greater than or equal to 1.";
  }

  if (pricingMode === "fixed" && payload.price_crc == null) {
    return "pricing_mode=fixed requires price_crc.";
  }
  if (pricingMode === "fixed" && payload.price_from_crc != null) {
    return "pricing_mode=fixed does not allow price_from_crc.";
  }
  if (pricingMode === "from" && payload.price_from_crc == null) {
    return "pricing_mode=from requires price_from_crc.";
  }
  if (pricingMode === "from" && payload.price_crc != null) {
    return "pricing_mode=from does not allow price_crc.";
  }
  if (pricingMode === "variable" && payload.price_crc == null) {
    return "pricing_mode=variable requires price_crc as base price.";
  }
  if (pricingMode === "variable" && payload.price_from_crc != null) {
    return "pricing_mode=variable does not allow price_from_crc.";
  }

  if (!payload.is_discountable && payload.discount_visibility !== "never") {
    return "Non-discountable products must use discount_visibility=never.";
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

function validateCreateDraft(draft: CreateProductDraft): string | null {
  if (!draft.name.trim()) {
    return "name cannot be empty.";
  }
  if (!draft.category.trim()) {
    return "category is required.";
  }
  if (!draft.family.trim()) {
    return "family is required.";
  }

  const minQty = toNumberOrNull(draft.min_qty);
  if (minQty == null || minQty < 1) {
    return "min_qty must be greater than or equal to 1.";
  }

  const price = toNumberOrNull(draft.price_crc);
  const priceFrom = toNumberOrNull(draft.price_from_crc);

  if (draft.pricing_mode === "fixed" && price == null) {
    return "pricing_mode=fixed requires price_crc.";
  }
  if (draft.pricing_mode === "fixed" && priceFrom != null) {
    return "pricing_mode=fixed does not allow price_from_crc.";
  }
  if (draft.pricing_mode === "from" && priceFrom == null) {
    return "pricing_mode=from requires price_from_crc.";
  }
  if (draft.pricing_mode === "from" && price != null) {
    return "pricing_mode=from does not allow price_crc.";
  }
  if (draft.pricing_mode === "variable" && price == null) {
    return "pricing_mode=variable requires price_crc as base price.";
  }
  if (draft.pricing_mode === "variable" && priceFrom != null) {
    return "pricing_mode=variable does not allow price_from_crc.";
  }
  if (!draft.is_discountable && draft.discount_visibility !== "never") {
    return "Non-discountable products must use discount_visibility=never.";
  }

  return null;
}

function buildCreatePayloadFromDraft(draft: CreateProductDraft): CreateProductInput {
  return {
    name: draft.name.trim(),
    category: draft.category.trim(),
    family: draft.family.trim(),
    variant_label: draft.variant_label.trim() || null,
    size_label: draft.size_label.trim() || null,
    pricing_mode: draft.pricing_mode,
    price_crc: toNumberOrNull(draft.price_crc),
    price_from_crc: toNumberOrNull(draft.price_from_crc),
    min_qty: toNumberOrNull(draft.min_qty) ?? 1,
    is_active: draft.is_active,
    is_agent_visible: draft.is_agent_visible,
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
  const [products, setProducts] = useState<ProductDetail[]>([]);
  const [currentMode, setCurrentMode] = useState<ProductMode>("catalog");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [performanceMetric, setPerformanceMetric] = useState<PerformanceMetric>("units");
  const [filters, setFilters] = useState<GlobalFilters>(defaultFilters);
  const [catalogTab, setCatalogTab] = useState<CatalogSidebarTab>("general");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateProductDraft>(defaultCreateDraft);
  const [skuControlEnabled, setSkuControlEnabled] = useState(false);
  const [skuDraft, setSkuDraft] = useState("");
  const [topPeriod, setTopPeriod] = useState<ProductsPerformanceRange>("30d");
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);
  const [createStatusMessage, setCreateStatusMessage] = useState<string | null>(null);
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

  const { updateProduct, isPending: isSavingProduct } = useUpdateProduct();
  const { createProduct, isPending: isCreatingProduct } = useCreateProduct();
  const { addImage, updateImage, deleteImage, addAlias, deleteAlias, addSearchTerm, updateSearchTerm, deleteSearchTerm, isPending: isUpdatingSearchMedia } =
    useProductSearchMedia();

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
    if (filteredProducts.length === 0) {
      setSelectedProductId(null);
      return;
    }

    const currentIsVisible = selectedProductId
      ? filteredProducts.some((product) => product.id === selectedProductId)
      : false;

    if (!currentIsVisible) {
      setSelectedProductId(filteredProducts[0]?.id ?? null);
    }
  }, [filteredProducts, selectedProductId]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const selectedProductEditablePayload = useMemo(
    () => (selectedProduct ? toUpdatePayload(selectedProduct) : null),
    [selectedProduct],
  );
  const originalSelectedEditablePayload = useMemo(
    () => (selectedProductDetail ? toUpdatePayload(selectedProductDetail) : null),
    [selectedProductDetail],
  );
  const hasPendingChanges = useMemo(() => {
    if (!selectedProductEditablePayload || !originalSelectedEditablePayload) {
      return false;
    }

    return (
      JSON.stringify(selectedProductEditablePayload) !==
      JSON.stringify(originalSelectedEditablePayload)
    );
  }, [originalSelectedEditablePayload, selectedProductEditablePayload]);
  const localValidationError = useMemo(
    () =>
      selectedProductEditablePayload
        ? validateProductPayloadForSave(selectedProductEditablePayload)
        : null,
    [selectedProductEditablePayload],
  );

  useEffect(() => {
    if (!selectedProduct) {
      setSkuDraft("");
      setSkuControlEnabled(false);
      setSaveStatusMessage(null);
      setSearchMetaMessage(null);
      return;
    }

    setSkuDraft(selectedProduct.sku);
    setSkuControlEnabled(false);
    setSaveStatusMessage(null);
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
  }, [selectedProduct]);

  const catalogRows = useMemo(() => filteredProducts.map(toCatalogRow), [filteredProducts]);
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

  const createPreviewId = useMemo(() => {
    const tokens = [
      toSlugToken(createDraft.category),
      toSlugToken(createDraft.family),
      toSlugToken(createDraft.name),
      toSlugToken(createDraft.variant_label),
    ].filter(Boolean);

    return tokens.join("_").replace(/_+/g, "_").replace(/^_+|_+$/g, "") || "product";
  }, [createDraft.category, createDraft.family, createDraft.name, createDraft.variant_label]);

  const createPreviewSku = useMemo(() => {
    return `MWL-${createPreviewId.replaceAll("_", "-").toUpperCase()}`.replace(/-+/g, "-");
  }, [createPreviewId]);

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

  function updateSelectedProductField<K extends keyof ProductDetail>(
    field: K,
    value: ProductDetail[K],
  ) {
    if (!selectedProductId) {
      return;
    }

    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === selectedProductId
          ? {
              ...product,
              [field]: value,
            }
          : product,
      ),
    );
    setSaveStatusMessage(null);
  }

  function applySkuDraft() {
    // Fase 2 mantiene SKU como solo lectura.
  }

  function createLocalProduct() {
    const validationError = validateCreateDraft(createDraft);
    if (validationError) {
      setCreateStatusMessage(validationError);
      return;
    }

    const payload = buildCreatePayloadFromDraft(createDraft);
    setCreateStatusMessage("Creando producto...");

    void createProduct({ input: payload })
      .then((createdProduct) => {
        setProducts((currentProducts) => {
          const withoutCurrent = currentProducts.filter(
            (product) => product.id !== createdProduct.id,
          );
          return [createdProduct, ...withoutCurrent];
        });
        setSelectedProductId(createdProduct.id);
        setCatalogTab("general");
        setIsCreateOpen(false);
        setCreateDraft(defaultCreateDraft);
        setCreateStatusMessage(null);
      })
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : "No se pudo crear el producto.";
        setCreateStatusMessage(message);
      });
  }

  async function handleSaveChanges() {
    if (!selectedProductId || !selectedProductEditablePayload || !hasPendingChanges) {
      return;
    }

    if (localValidationError) {
      setSaveStatusMessage(localValidationError);
      return;
    }

    setSaveStatusMessage("Guardando...");

    try {
      const updatedProduct = await updateProduct({
        id: selectedProductId,
        input: selectedProductEditablePayload,
      });

      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === updatedProduct.id ? updatedProduct : product,
        ),
      );
      setSaveStatusMessage("Cambios guardados");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron guardar los cambios.";
      setSaveStatusMessage(message);
    }
  }

  async function handleAddAlias() {
    if (!selectedProductId || !newAlias.trim()) {
      return;
    }

    setSearchMetaMessage("Guardando alias...");
    try {
      const updated = await addAlias(selectedProductId, { alias: newAlias });
      setProducts((currentProducts) =>
        currentProducts.map((product) => (product.id === updated.id ? updated : product)),
      );
      setNewAlias("");
      setSearchMetaMessage("Alias guardado");
    } catch (error) {
      setSearchMetaMessage(error instanceof Error ? error.message : "No se pudo guardar alias.");
    }
  }

  async function handleDeleteAlias(aliasId: number) {
    if (!selectedProductId) {
      return;
    }

    setSearchMetaMessage("Eliminando alias...");
    try {
      const updated = await deleteAlias(selectedProductId, aliasId);
      setProducts((currentProducts) =>
        currentProducts.map((product) => (product.id === updated.id ? updated : product)),
      );
      setSearchMetaMessage("Alias eliminado");
    } catch (error) {
      setSearchMetaMessage(error instanceof Error ? error.message : "No se pudo eliminar alias.");
    }
  }

  async function handleAddSearchTerm() {
    if (!selectedProductId || !newSearchTermDraft.term.trim()) {
      return;
    }

    setSearchMetaMessage("Guardando search term...");
    try {
      const updated = await addSearchTerm(selectedProductId, {
        term: newSearchTermDraft.term,
        term_type: "alias",
        priority: toNumberOrNull(newSearchTermDraft.priority) ?? 100,
        is_active: newSearchTermDraft.is_active,
        notes: newSearchTermDraft.notes.trim() || null,
      });
      setProducts((currentProducts) =>
        currentProducts.map((product) => (product.id === updated.id ? updated : product)),
      );
      setNewSearchTermDraft((current) => ({
        ...current,
        term: "",
        notes: "",
      }));
      setSearchMetaMessage("Search term guardado");
    } catch (error) {
      setSearchMetaMessage(
        error instanceof Error ? error.message : "No se pudo guardar search term.",
      );
    }
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
    if (!selectedProductId) {
      return;
    }

    setSearchMetaMessage("Actualizando search term...");
    try {
      const updated = await updateSearchTerm(selectedProductId, termId, updates);
      setProducts((currentProducts) =>
        currentProducts.map((product) => (product.id === updated.id ? updated : product)),
      );
      setSearchMetaMessage("Search term actualizado");
    } catch (error) {
      setSearchMetaMessage(
        error instanceof Error ? error.message : "No se pudo actualizar search term.",
      );
    }
  }

  async function handleDeleteSearchTerm(termId: number) {
    if (!selectedProductId) {
      return;
    }

    setSearchMetaMessage("Eliminando search term...");
    try {
      const updated = await deleteSearchTerm(selectedProductId, termId);
      setProducts((currentProducts) =>
        currentProducts.map((product) => (product.id === updated.id ? updated : product)),
      );
      setSearchMetaMessage("Search term eliminado");
    } catch (error) {
      setSearchMetaMessage(
        error instanceof Error ? error.message : "No se pudo eliminar search term.",
      );
    }
  }

  async function handleAddImage() {
    if (!selectedProductId || !newImageDraft.storage_path.trim()) {
      return;
    }

    setSearchMetaMessage("Guardando imagen...");
    try {
      const updated = await addImage(selectedProductId, {
        storage_bucket: newImageDraft.storage_bucket,
        storage_path: newImageDraft.storage_path,
        alt_text: newImageDraft.alt_text.trim() || null,
        is_primary: newImageDraft.is_primary,
        sort_order: toNumberOrNull(newImageDraft.sort_order) ?? undefined,
      });
      setProducts((currentProducts) =>
        currentProducts.map((product) => (product.id === updated.id ? updated : product)),
      );
      setNewImageDraft({
        storage_bucket: "mwl-products",
        storage_path: "",
        alt_text: "",
        is_primary: false,
        sort_order: "",
      });
      setSearchMetaMessage("Imagen guardada");
    } catch (error) {
      setSearchMetaMessage(error instanceof Error ? error.message : "No se pudo guardar imagen.");
    }
  }

  async function handleTogglePrimaryImage(imageId: number, isPrimary: boolean) {
    if (!selectedProductId) {
      return;
    }

    setSearchMetaMessage("Actualizando imagen...");
    try {
      const updated = await updateImage(selectedProductId, imageId, {
        is_primary: !isPrimary,
      });
      setProducts((currentProducts) =>
        currentProducts.map((product) => (product.id === updated.id ? updated : product)),
      );
      setSearchMetaMessage("Imagen actualizada");
    } catch (error) {
      setSearchMetaMessage(
        error instanceof Error ? error.message : "No se pudo actualizar imagen.",
      );
    }
  }

  async function handleUpdateImageAlt(imageId: number, altText: string) {
    if (!selectedProductId) {
      return;
    }

    setSearchMetaMessage("Actualizando alt_text...");
    try {
      const updated = await updateImage(selectedProductId, imageId, {
        alt_text: altText || null,
      });
      setProducts((currentProducts) =>
        currentProducts.map((product) => (product.id === updated.id ? updated : product)),
      );
      setSearchMetaMessage("alt_text actualizado");
    } catch (error) {
      setSearchMetaMessage(
        error instanceof Error ? error.message : "No se pudo actualizar alt_text.",
      );
    }
  }

  async function handleUpdateImageSort(imageId: number, sortOrder: number) {
    if (!selectedProductId) {
      return;
    }

    setSearchMetaMessage("Actualizando orden de imagen...");
    try {
      const updated = await updateImage(selectedProductId, imageId, {
        sort_order: sortOrder,
      });
      setProducts((currentProducts) =>
        currentProducts.map((product) => (product.id === updated.id ? updated : product)),
      );
      setSearchMetaMessage("Orden de imagen actualizado");
    } catch (error) {
      setSearchMetaMessage(
        error instanceof Error ? error.message : "No se pudo actualizar sort_order.",
      );
    }
  }

  async function handleDeleteImage(imageId: number) {
    if (!selectedProductId) {
      return;
    }

    setSearchMetaMessage("Eliminando imagen...");
    try {
      const updated = await deleteImage(selectedProductId, imageId);
      setProducts((currentProducts) =>
        currentProducts.map((product) => (product.id === updated.id ? updated : product)),
      );
      setSearchMetaMessage("Imagen eliminada");
    } catch (error) {
      setSearchMetaMessage(error instanceof Error ? error.message : "No se pudo eliminar imagen.");
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-6 rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
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
                onClick={() => setCurrentMode("catalog")}
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
                onClick={() => setCurrentMode("performance")}
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
          <article className="rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Productos activos
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{catalogKpis.activeProducts}</p>
          </article>
          <article className="rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Visibles al agente
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{catalogKpis.agentVisibleProducts}</p>
          </article>
          <article className="rounded-[24px] border border-amber-200/80 bg-amber-50/80 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
              Con alertas de integridad
            </p>
            <p className="mt-2 text-3xl font-semibold text-amber-900">{catalogKpis.withAlerts}</p>
          </article>
          <article className="rounded-[24px] border border-rose-200/80 bg-rose-50/80 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
              Sin imagen principal
            </p>
            <p className="mt-2 text-3xl font-semibold text-rose-800">{catalogKpis.withoutPrimaryImage}</p>
          </article>
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Unidades vendidas
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {(performanceData?.summary.units_sold_total ?? 0).toLocaleString("es-CR")}
            </p>
          </article>
          <article className="rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Ingresos
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {formatCurrencyCRC(performanceData?.summary.revenue_total_crc ?? 0)}
            </p>
          </article>
          <article className="rounded-[24px] border border-amber-200/80 bg-amber-50/80 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
              Productos sin ventas
            </p>
            <p className="mt-2 text-3xl font-semibold text-amber-900">
              {performanceData?.summary.products_without_sales ?? 0}
            </p>
          </article>
          <article className="rounded-[24px] border border-rose-200/80 bg-rose-50/80 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
              Alertas comerciales
            </p>
            <p className="mt-2 text-3xl font-semibold text-rose-800">
              {performanceData?.summary.products_with_commercial_alerts ?? 0}
            </p>
          </article>
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,0.85fr)]">
        <div className="space-y-6">
          {currentMode === "catalog" ? (
            <section className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border/70 text-left">
                  <thead>
                    <tr className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      <th className="px-3 py-3">Producto</th>
                      <th className="px-3 py-3">SKU</th>
                      <th className="px-3 py-3">Categoria / Family</th>
                      <th className="px-3 py-3">Precio</th>
                      <th className="px-3 py-3">Estado</th>
                      <th className="px-3 py-3">Agente</th>
                      <th className="px-3 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {isCatalogLoading ? (
                      <TableEmptyStateRow
                        colSpan={7}
                        title="Cargando catalogo real"
                        description="Consultando mwl_products_with_primary_image..."
                      />
                    ) : null}
                    {catalogRows.map((row) => {
                      const isSelected = row.id === selectedProductId;

                      return (
                        <tr
                          key={row.id}
                          className={`cursor-pointer text-sm text-slate-700 transition hover:bg-slate-50 ${
                            isSelected ? "bg-slate-50/80" : ""
                          }`}
                          onClick={() => setSelectedProductId(row.id)}
                        >
                          <td className="px-3 py-4 align-top">
                            <div className="flex items-start gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-slate-100 text-muted-foreground">
                                {row.primary_image_path ? (
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
                          <td className="px-3 py-4 align-top text-right">
                            <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full">
                              <Ellipsis className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                    {!isCatalogLoading && catalogRows.length === 0 ? (
                      <TableEmptyStateRow
                        colSpan={7}
                        title="No hay productos para este filtro"
                        description="Ajusta query, category, min_qty o exact_product_id para volver a ver resultados."
                      />
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <section className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
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
                      <th className="px-3 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {isPerformanceLoading ? (
                      <TableEmptyStateRow
                        colSpan={8}
                        title="Cargando performance real"
                        description="Agregando ventas validas por product_id..."
                      />
                    ) : null}
                    {performanceRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`cursor-pointer text-sm text-slate-700 transition hover:bg-slate-50 ${
                          row.id === selectedProductId ? "bg-slate-50/80" : ""
                        }`}
                        onClick={() => setSelectedProductId(row.id)}
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
                        <td className="px-3 py-4 text-right">
                          <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full">
                            <Ellipsis className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {!isPerformanceLoading && performanceRows.length === 0 ? (
                      <TableEmptyStateRow
                        colSpan={8}
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

        <aside className="space-y-6">
          {currentMode === "catalog" ? (
            <>
              <section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                {!selectedProductId ? (
                  <StateDisplay
                    compact
                    title="Selecciona un producto"
                    description="El panel contextual muestra detalle catalogo por producto."
                  />
                ) : isSelectedProductLoading && !selectedProduct ? (
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
                ) : !selectedProduct ? (
                  <StateDisplay
                    compact
                    title="Producto no disponible"
                    description="El producto no fue encontrado en la consulta actual."
                  />
                ) : (
                  <div className="space-y-5">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/70">
                        Product detail
                      </p>
                      <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                        {selectedProduct.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">{selectedProduct.id}</p>
                      {selectedProduct.ui_created_locally ? (
                        <StatusBadge tone="warning" className="mt-2">
                          Draft local UI
                        </StatusBadge>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-slate-50/70 p-3">
                      <p className="text-xs text-muted-foreground">
                        {localValidationError ??
                          saveStatusMessage ??
                          "Edita campos permitidos y guarda cambios."}
                      </p>
                      <Button
                        type="button"
                        onClick={handleSaveChanges}
                        disabled={
                          !hasPendingChanges ||
                          Boolean(localValidationError) ||
                          isSavingProduct ||
                          !selectedProductDetail
                        }
                      >
                        {isSavingProduct ? "Guardando..." : "Guardar cambios"}
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
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

                    {catalogTab === "general" ? (
                      <fieldset className="space-y-3">
                        <label className="space-y-1">
                          <span className="text-xs text-muted-foreground">name</span>
                          <input
                            value={selectedProduct.name}
                            onChange={(event) =>
                              updateSelectedProductField("name", event.target.value)
                            }
                            className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                          />
                        </label>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="space-y-1">
                            <span className="text-xs text-muted-foreground">category (sensible)</span>
                            <input
                              value={selectedProduct.category}
                              readOnly
                              className="h-10 w-full rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm text-amber-900"
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs text-muted-foreground">family (sensible)</span>
                            <input
                              value={selectedProduct.family}
                              readOnly
                              className="h-10 w-full rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm text-amber-900"
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs text-muted-foreground">variant_label</span>
                            <input
                              value={selectedProduct.variant_label ?? ""}
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
                              value={selectedProduct.size_label ?? ""}
                              onChange={(event) =>
                                updateSelectedProductField(
                                  "size_label",
                                  event.target.value || null,
                                )
                              }
                              className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                            />
                          </label>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="space-y-1">
                            <span className="text-xs text-muted-foreground">material</span>
                            <input
                              value={selectedProduct.material ?? ""}
                              onChange={(event) =>
                                updateSelectedProductField("material", event.target.value || null)
                              }
                              className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs text-muted-foreground">base_color</span>
                            <input
                              value={selectedProduct.base_color ?? ""}
                              onChange={(event) =>
                                updateSelectedProductField("base_color", event.target.value || null)
                              }
                              className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs text-muted-foreground">print_type</span>
                            <input
                              value={selectedProduct.print_type ?? ""}
                              onChange={(event) =>
                                updateSelectedProductField("print_type", event.target.value || null)
                              }
                              className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs text-muted-foreground">personalization_area</span>
                            <input
                              value={selectedProduct.personalization_area ?? ""}
                              onChange={(event) =>
                                updateSelectedProductField(
                                  "personalization_area",
                                  event.target.value || null,
                                )
                              }
                              className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                            />
                          </label>
                        </div>
                        <label className="space-y-1">
                          <span className="text-xs text-muted-foreground">summary</span>
                          <textarea
                            value={selectedProduct.summary ?? ""}
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
                            value={selectedProduct.details ?? ""}
                            onChange={(event) =>
                              updateSelectedProductField("details", event.target.value || null)
                            }
                            rows={3}
                            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-primary"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs text-muted-foreground">notes</span>
                          <textarea
                            value={selectedProduct.notes ?? ""}
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
                      <fieldset className="space-y-3">
                        <div className="rounded-2xl border border-border/70 bg-slate-50/80 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            aliases
                          </p>
                          <div className="mt-2 flex gap-2">
                            <input
                              value={newAlias}
                              onChange={(event) => setNewAlias(event.target.value)}
                              placeholder="Nuevo alias"
                              className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleAddAlias}
                              disabled={!newAlias.trim() || isUpdatingSearchMedia}
                            >
                              Agregar
                            </Button>
                          </div>
                          <div className="mt-2 space-y-2">
                            {selectedProduct.search_meta.alias_entries.length > 0 ? (
                              selectedProduct.search_meta.alias_entries.map((entry) => (
                                <div
                                  key={entry.id}
                                  className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm text-slate-800"
                                >
                                  <span>{entry.alias}</span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleDeleteAlias(entry.id)}
                                    disabled={isUpdatingSearchMedia}
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
                          <div className="mt-2 grid gap-2 sm:grid-cols-[2fr_1fr_2fr_auto]">
                            <input
                              value={newSearchTermDraft.term}
                              onChange={(event) =>
                                setNewSearchTermDraft((current) => ({
                                  ...current,
                                  term: event.target.value,
                                }))
                              }
                              placeholder="term"
                              className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
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
                              className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                            />
                            <input
                              value={newSearchTermDraft.notes}
                              onChange={(event) =>
                                setNewSearchTermDraft((current) => ({
                                  ...current,
                                  notes: event.target.value,
                                }))
                              }
                              placeholder="notes"
                              className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleAddSearchTerm}
                              disabled={!newSearchTermDraft.term.trim() || isUpdatingSearchMedia}
                            >
                              Agregar
                            </Button>
                          </div>
                          <div className="mt-2 space-y-2 text-sm">
                            {selectedProduct.search_meta.search_terms.length > 0 ? (
                              selectedProduct.search_meta.search_terms.map((term) => (
                                <div key={term.id} className="rounded-xl bg-white px-3 py-2 text-slate-800">
                                  <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_2fr_auto_auto] sm:items-center">
                                    <input
                                      defaultValue={term.term}
                                      onBlur={(event) => {
                                        const nextTerm = event.target.value.trim();
                                        if (nextTerm && nextTerm !== term.term) {
                                          void handleUpdateSearchTerm(term.id, { term: nextTerm });
                                        }
                                      }}
                                      className="h-9 rounded-lg border border-border bg-white px-2 text-xs text-slate-950 outline-none transition focus:border-primary"
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
                                      className="h-9 rounded-lg border border-border bg-white px-2 text-xs text-slate-950 outline-none transition focus:border-primary"
                                    />
                                    <input
                                      defaultValue={term.notes ?? ""}
                                      onBlur={(event) => {
                                        const notes = event.target.value.trim();
                                        if (notes !== (term.notes ?? "")) {
                                          void handleUpdateSearchTerm(term.id, { notes: notes || null });
                                        }
                                      }}
                                      className="h-9 rounded-lg border border-border bg-white px-2 text-xs text-slate-950 outline-none transition focus:border-primary"
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
                                      disabled={isUpdatingSearchMedia}
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
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-border/70 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Primary image
                          </p>
                          {selectedProduct.search_meta.storage_bucket &&
                          selectedProduct.search_meta.storage_path ? (
                            <div className="mt-3 space-y-1 text-sm text-slate-800">
                              <p>primary_image_bucket: {selectedProduct.search_meta.storage_bucket}</p>
                              <p>primary_image_path: {selectedProduct.search_meta.storage_path}</p>
                              <p>primary_image_alt: {selectedProduct.search_meta.alt_text ?? "Sin alt_text"}</p>
                            </div>
                          ) : (
                            <p className="mt-3 text-sm text-muted-foreground">Sin imagen primaria registrada.</p>
                          )}
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            mwl_product_images
                          </p>
                          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_2fr_1fr_1fr_auto]">
                            <input
                              value={newImageDraft.storage_bucket}
                              onChange={(event) =>
                                setNewImageDraft((current) => ({
                                  ...current,
                                  storage_bucket: event.target.value,
                                }))
                              }
                              placeholder="bucket"
                              className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
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
                              className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
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
                              className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                            />
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
                              className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleAddImage}
                              disabled={!newImageDraft.storage_path.trim() || isUpdatingSearchMedia}
                            >
                              Agregar
                            </Button>
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
                                  <div className="flex items-center justify-between gap-2">
                                    <p>{image.storage_bucket}</p>
                                    <div className="flex gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleTogglePrimaryImage(image.id, image.is_primary)}
                                        disabled={isUpdatingSearchMedia}
                                      >
                                        {image.is_primary ? "Quitar primaria" : "Marcar primaria"}
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleDeleteImage(image.id)}
                                        disabled={isUpdatingSearchMedia}
                                      >
                                        Eliminar
                                      </Button>
                                    </div>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{image.storage_path}</p>
                                  <div className="mt-2 grid gap-2 sm:grid-cols-[2fr_1fr]">
                                    <input
                                      defaultValue={image.alt_text ?? ""}
                                      onBlur={(event) => {
                                        const nextAlt = event.target.value.trim();
                                        if (nextAlt !== (image.alt_text ?? "")) {
                                          void handleUpdateImageAlt(image.id, nextAlt);
                                        }
                                      }}
                                      placeholder="alt_text"
                                      className="h-9 rounded-lg border border-border bg-white px-2 text-xs text-slate-950 outline-none transition focus:border-primary"
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
                                      className="h-9 rounded-lg border border-border bg-white px-2 text-xs text-slate-950 outline-none transition focus:border-primary"
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
                              Campos sensibles: <strong>id</strong>, <strong>sku</strong>,{" "}
                              <strong>family</strong>, <strong>category</strong>. `id` es solo lectura.
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
                )}
              </section>
            </>
          ) : (
            <>
              <section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
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

              <section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
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

              <section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
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

      {isCreateOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
                Nuevo producto
              </p>
              <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                Alta segura en catalogo
              </h3>
              <p className="text-sm text-muted-foreground">
                Crea el producto minimo valido y luego completa multimedia/busqueda desde el detalle.
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary/70 sm:col-span-2">
                General
              </p>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-muted-foreground">name</span>
                <input
                  value={createDraft.name}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, name: event.target.value }))
                  }
                  className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">family</span>
                <input
                  value={createDraft.family}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, family: event.target.value }))
                  }
                  list="family-options"
                  className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">category</span>
                <input
                  value={createDraft.category}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, category: event.target.value }))
                  }
                  list="category-options"
                  className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                />
              </label>
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
                  className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                />
              </label>

              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary/70 sm:col-span-2">
                Pricing
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
                  value={createDraft.price_crc}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, price_crc: event.target.value }))
                  }
                  inputMode="numeric"
                  className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-primary"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">price_from_crc</span>
                <input
                  value={createDraft.price_from_crc}
                  onChange={(event) =>
                    setCreateDraft((current) => ({
                      ...current,
                      price_from_crc: event.target.value,
                    }))
                  }
                  inputMode="numeric"
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
                  checked={createDraft.is_agent_visible}
                  onChange={(event) =>
                    setCreateDraft((current) => ({
                      ...current,
                      is_agent_visible: event.target.checked,
                    }))
                  }
                />
                is_agent_visible
              </label>

              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary/70 sm:col-span-2">
                Rules
              </p>
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

              <div className="space-y-2 sm:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-900">
                  `id` es solo lectura y se genera en backend. `sku` se autogenera y no es editable en alta estandar.
                </p>
                <p className="text-sm text-amber-900">id preview: {createPreviewId}</p>
                <p className="text-sm text-amber-900">sku preview: {createPreviewSku}</p>
              </div>
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
              <p className="sm:col-span-2 text-xs text-muted-foreground">
                {createStatusMessage ??
                  "Al crear se guarda en mwl_products, se refresca indice y se abre el detalle del nuevo producto."}
              </p>
            </div>
            <datalist id="category-options">
              {categoryOptions.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
            <datalist id="family-options">
              {familyOptions.map((family) => (
                <option key={family} value={family} />
              ))}
            </datalist>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false);
                  setCreateStatusMessage(null);
                }}
                disabled={isCreatingProduct}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={createLocalProduct} disabled={isCreatingProduct}>
                {isCreatingProduct ? "Creando..." : "Crear producto"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-[28px] border border-dashed border-amber-300 bg-amber-50/70 p-4 text-sm text-amber-900">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Performance ahora usa datos reales agregados por `order_items.product_id` y estados
            vendibles de `orders`. Margen y stock se muestran como N/D mientras no exista fuente real.
          </p>
        </div>
      </section>
    </div>
  );
}

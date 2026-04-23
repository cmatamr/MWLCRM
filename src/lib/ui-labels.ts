const FRIENDLY_FIELD_LABELS: Record<string, string> = {
  lead_thread_id: "ID de conversación",
  display_name: "Nombre de contacto",
  lead_stage: "Etapa comercial",
  total_messages: "Total de mensajes",
  external_id: "Identificador externo",
  pricing_mode: "Modalidad de precio",
  max_price_crc: "Precio máximo (CRC)",
  min_qty: "Cantidad mínima",
  exact_product_id: "ID exacto del producto",
  variant_label: "Variante",
  size_label: "Tamaño",
  base_color: "Color base",
  price_crc: "Precio (CRC)",
  price_from_crc: "Precio base rangos (CRC)",
  discount_visibility: "Visibilidad del descuento",
  search_boost: "Prioridad de búsqueda",
  source_type: "Origen del registro",
  source_ref: "Referencia de origen",
  updated_at: "Última actualización",
  allows_name: "Permite personalizar nombre",
  is_active: "Activo",
  is_discountable: "Permite descuento",
  is_agent_visible: "Visible para el agente",
  requires_design_approval: "Requiere aprobación de diseño",
  extra_adjustment_has_cost: "Ajustes extra con costo",
  includes_design_adjustment_count: "Ajustes incluidos",
  sort_order: "Orden de visualización",
  term_type: "Tipo de término",
  exact_match: "Coincidencia exacta",
  direct_match: "Coincidencia directa",
  match_quality: "Calidad de coincidencia",
  storage_bucket: "Contenedor de archivos",
  storage_path: "Ruta del archivo",
  alt_text: "Texto alternativo",
  primary_image_bucket: "Contenedor imagen principal",
  primary_image_path: "Ruta imagen principal",
  primary_image_alt: "Texto alternativo imagen principal",
  search_terms: "Términos de búsqueda",
};

export function getFriendlyFieldLabel(fieldKey: string): string {
  return FRIENDLY_FIELD_LABELS[fieldKey] ?? fieldKey;
}

export function getFriendlyPricingModeLabel(mode: "fixed" | "range" | "variable"): string {
  if (mode === "fixed") {
    return "Precio fijo";
  }

  if (mode === "range") {
    return "Precio por rangos";
  }

  return "Precio variable";
}

export function getFriendlyDiscountVisibilityLabel(
  visibility: "never" | "only_if_customer_requests" | "internal_only" | "always",
): string {
  if (visibility === "never") {
    return "No mostrar";
  }

  if (visibility === "only_if_customer_requests") {
    return "Solo si el cliente lo solicita";
  }

  if (visibility === "internal_only") {
    return "Solo uso interno";
  }

  return "Mostrar siempre";
}

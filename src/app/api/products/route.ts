import { badRequest, handleRouteError, ok, parsePositiveIntParam, parseStringParam } from "@/server/api/http";
import {
  createProduct,
  listCatalogProducts,
  type ListCatalogProductsParams,
  type ProductPricingMode,
} from "@/server/services/products";
import { z } from "zod";

const PRODUCT_PRICING_MODES: ProductPricingMode[] = ["fixed", "from", "variable"];

const createProductPayloadSchema = z
  .object({
    name: z.string().trim().min(1).max(180),
    category: z.string().trim().min(1),
    family: z.string().trim().min(1),
    pricing_mode: z.enum(["fixed", "from", "variable"]),
    price_crc: z.number().int().min(0).optional().nullable(),
    price_from_crc: z.number().int().min(0).optional().nullable(),
    min_qty: z.number().int().min(1),
    is_active: z.boolean().optional(),
    is_agent_visible: z.boolean().optional(),
    variant_label: z.string().optional().nullable(),
    size_label: z.string().optional().nullable(),
    material: z.string().optional().nullable(),
    base_color: z.string().optional().nullable(),
    print_type: z.string().optional().nullable(),
    personalization_area: z.string().optional().nullable(),
    summary: z.string().optional().nullable(),
    details: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    allows_name: z.boolean().optional(),
    includes_design_adjustment_count: z.number().int().min(0).optional(),
    extra_adjustment_has_cost: z.boolean().optional(),
    requires_design_approval: z.boolean().optional(),
    is_full_color: z.boolean().optional(),
    is_premium: z.boolean().optional(),
    is_discountable: z.boolean().optional(),
    discount_visibility: z
      .enum(["never", "only_if_customer_requests", "internal_only", "always"])
      .optional(),
    search_boost: z.number().int().optional(),
    sort_order: z.number().int().min(0).optional(),
  })
  .strict();

function parseBooleanParam(searchParams: URLSearchParams, key: string): boolean | undefined {
  const value = parseStringParam(searchParams, key);

  if (value == null) {
    return undefined;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw badRequest(`Query param "${key}" must be "true" or "false".`, {
    key,
    value,
  });
}

function parsePricingModeParam(
  searchParams: URLSearchParams,
): ProductPricingMode | undefined {
  const value = parseStringParam(searchParams, "pricing_mode");

  if (!value) {
    return undefined;
  }

  if (!PRODUCT_PRICING_MODES.includes(value as ProductPricingMode)) {
    throw badRequest('Query param "pricing_mode" has an invalid value.', {
      key: "pricing_mode",
      value,
      allowedValues: PRODUCT_PRICING_MODES,
    });
  }

  return value as ProductPricingMode;
}

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;

    const params: ListCatalogProductsParams = {
      page: parsePositiveIntParam(searchParams, "page"),
      pageSize: parsePositiveIntParam(searchParams, "page_size"),
      search: parseStringParam(searchParams, "search"),
      category: parseStringParam(searchParams, "category"),
      family: parseStringParam(searchParams, "family"),
      isActive: parseBooleanParam(searchParams, "is_active"),
      isAgentVisible: parseBooleanParam(searchParams, "is_agent_visible"),
      pricingMode: parsePricingModeParam(searchParams),
      maxPriceCrc: parsePositiveIntParam(searchParams, "max_price_crc"),
      minQty: parsePositiveIntParam(searchParams, "min_qty"),
      exactProductId: parseStringParam(searchParams, "exact_product_id"),
    };

    const products = await listCatalogProducts(params);
    return ok(products);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      throw badRequest("Invalid JSON body.");
    }

    const payload = createProductPayloadSchema.parse(rawBody);
    const product = await createProduct(payload);
    return ok(product);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return handleRouteError(badRequest("Invalid JSON body."));
    }

    return handleRouteError(error);
  }
}

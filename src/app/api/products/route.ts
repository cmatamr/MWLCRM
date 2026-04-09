import {
  ApiRouteError,
  badRequest,
  handleRouteError,
  ok,
  parsePositiveIntParam,
  parseStringParam,
} from "@/server/api/http";
import { requireRole, requireSessionProfile } from "@/server/api/auth";
import {
  listCatalogProducts,
  type ListCatalogProductsParams,
  type ProductPricingMode,
} from "@/server/services/products";

const PRODUCT_PRICING_MODES: ProductPricingMode[] = ["fixed", "from", "variable"];

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
    await requireSessionProfile();
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

export async function POST(_request: Request) {
  try {
    await requireRole("admin");
    throw new ApiRouteError({
      status: 410,
      code: "DEPRECATED_ROUTE",
      message:
        "POST /api/products is deprecated. Use POST /api/products/save with publication_mode to enforce NOVA publication contract.",
      details: {
        deprecated_route: "POST /api/products",
        replacement_route: "POST /api/products/save",
        required_fields: ["publication_mode", "product"],
        allowed_publication_mode: ["internal", "nova"],
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

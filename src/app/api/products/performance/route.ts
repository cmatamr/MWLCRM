import {
  badRequest,
  handleRouteError,
  ok,
  parseLiteralParam,
  parsePositiveIntParam,
  parseStringParam,
} from "@/server/api/http";
import {
  getProductsPerformance,
  type GetProductsPerformanceParams,
  type ProductPricingMode,
  type ProductsPerformanceRange,
} from "@/server/services/products";

const PRODUCT_PRICING_MODES: ProductPricingMode[] = ["fixed", "from", "variable"];
const PERFORMANCE_RANGES: ProductsPerformanceRange[] = ["7d", "30d", "90d", "all"];

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

function parsePricingModeParam(searchParams: URLSearchParams): ProductPricingMode | undefined {
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

    const params: GetProductsPerformanceParams = {
      range: parseLiteralParam(searchParams, "range", PERFORMANCE_RANGES) ?? "30d",
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

    const data = await getProductsPerformance(params);
    return ok(data);
  } catch (error) {
    return handleRouteError(error);
  }
}

import { handleRouteError, ok, parsePositiveIntParam, parseStringParam } from "@/server/api/http";
import { requireSessionProfile } from "@/server/api/auth";
import { listOrderCatalogProductOptions } from "@/server/services/orders";

export async function GET(request: Request) {
  try {
    await requireSessionProfile();
    const searchParams = new URL(request.url).searchParams;
    const query = parseStringParam(searchParams, "query");
    const qty = parsePositiveIntParam(searchParams, "qty");
    const exactProductId = parseStringParam(searchParams, "exact_product_id");
    const options = await listOrderCatalogProductOptions({ query, qty, exactProductId });

    return ok(options);
  } catch (error) {
    return handleRouteError(error);
  }
}

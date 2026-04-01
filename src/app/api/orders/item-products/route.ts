import { handleRouteError, ok } from "@/server/api/http";
import { listOrderCatalogProductOptions } from "@/server/services/orders";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get("query")?.trim() ?? undefined;
    const options = await listOrderCatalogProductOptions({ query });

    return ok(options);
  } catch (error) {
    return handleRouteError(error);
  }
}

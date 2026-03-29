import { listOrdersParamsSchema, parseQueryParams } from "@/domain/crm/schemas";
import { handleRouteError, ok } from "@/server/api/http";
import { listOrders } from "@/server/services/orders";

export async function GET(request: Request) {
  try {
    const orders = await listOrders(
      parseQueryParams(listOrdersParamsSchema, new URL(request.url).searchParams),
    );
    return ok(orders);
  } catch (error) {
    return handleRouteError(error);
  }
}

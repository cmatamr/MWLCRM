import { crmEntityIdParamsSchema } from "@/domain/crm/schemas";
import {
  handleRouteError,
  notFound,
  ok,
  parsePositiveIntParam,
  parseStringParam,
  RouteContext,
} from "@/server/api/http";
import { requireSessionProfile } from "@/server/api/auth";
import { CreateOrderItemError, listOrderItemProductOptions } from "@/server/services/orders";

export async function GET(request: Request, context: RouteContext<{ id: string }>) {
  try {
    await requireSessionProfile();
    const orderId = crmEntityIdParamsSchema.parse(await context.params).id;
    const searchParams = new URL(request.url).searchParams;
    const query = parseStringParam(searchParams, "query");
    const qty = parsePositiveIntParam(searchParams, "qty");
    const exactProductId = parseStringParam(searchParams, "exact_product_id");

    const options = await listOrderItemProductOptions({
      orderId,
      query,
      qty,
      exactProductId,
    });

    return ok(options);
  } catch (error) {
    if (error instanceof CreateOrderItemError && error.code === "ORDER_NOT_FOUND") {
      return handleRouteError(notFound(error.message, error.details));
    }

    return handleRouteError(error);
  }
}

import { crmEntityIdParamsSchema } from "@/domain/crm/schemas";
import {
  handleRouteError,
  notFound,
  ok,
  RouteContext,
} from "@/server/api/http";
import { getOrderDetail } from "@/server/services/orders";

export async function GET(_request: Request, context: RouteContext<{ id: string }>) {
  try {
    const orderId = crmEntityIdParamsSchema.parse(await context.params).id;
    const order = await getOrderDetail(orderId);

    if (!order) {
      throw notFound("Order not found.", { id: orderId });
    }

    return ok(order);
  } catch (error) {
    return handleRouteError(error);
  }
}

import { logApiRouteError } from "@/server/observability/api-route";
import { orderItemRouteParamsSchema, updateOrderItemDeliveryDateSchema } from "@/domain/crm/schemas";
import { badRequest, handleRouteError, notFound, ok, RouteContext } from "@/server/api/http";
import { requireAnyRole } from "@/server/api/auth";
import { UpdateOrderItemDeliveryDateError, updateOrderItemDeliveryDate } from "@/server/services/orders";

export async function PATCH(
  request: Request,
  context: RouteContext<{ id: string; itemId: string }>,
) {
  try {
    await requireAnyRole(["admin", "agent"]);
    const params = orderItemRouteParamsSchema.parse(await context.params);
    const body = updateOrderItemDeliveryDateSchema.parse(await request.json());

    const order = await updateOrderItemDeliveryDate({
      orderId: params.id,
      itemId: params.itemId,
      deliveryDate: body.deliveryDate,
    });

    return ok(order);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return handleRouteError(badRequest("Invalid JSON body."));
    }

    if (error instanceof UpdateOrderItemDeliveryDateError) {
      if (
        error.code === "ORDER_NOT_FOUND" ||
        error.code === "ITEM_NOT_FOUND" ||
        error.code === "ITEM_NOT_IN_ORDER"
      ) {
        return handleRouteError(notFound(error.message, error.details));
      }
    }

    const response = handleRouteError(error);
    await logApiRouteError({
      request: request,
      route: "/api/orders/[id]/items/[itemId]/event-date",
      source: "api.orders",
      defaultEventType: "orders_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

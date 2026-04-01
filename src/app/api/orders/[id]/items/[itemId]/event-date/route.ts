import { orderItemRouteParamsSchema, updateOrderItemEventDateSchema } from "@/domain/crm/schemas";
import { badRequest, handleRouteError, notFound, ok, RouteContext } from "@/server/api/http";
import { UpdateOrderItemEventDateError, updateOrderItemEventDate } from "@/server/services/orders";

export async function PATCH(
  request: Request,
  context: RouteContext<{ id: string; itemId: string }>,
) {
  try {
    const params = orderItemRouteParamsSchema.parse(await context.params);
    const body = updateOrderItemEventDateSchema.parse(await request.json());

    const order = await updateOrderItemEventDate({
      orderId: params.id,
      itemId: params.itemId,
      eventDate: body.eventDate,
    });

    return ok(order);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return handleRouteError(badRequest("Invalid JSON body."));
    }

    if (error instanceof UpdateOrderItemEventDateError) {
      if (
        error.code === "ORDER_NOT_FOUND" ||
        error.code === "ITEM_NOT_FOUND" ||
        error.code === "ITEM_NOT_IN_ORDER"
      ) {
        return handleRouteError(notFound(error.message, error.details));
      }
    }

    return handleRouteError(error);
  }
}

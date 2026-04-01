import { orderItemRouteParamsSchema, updateOrderItemQuantitySchema } from "@/domain/crm/schemas";
import { badRequest, handleRouteError, notFound, ok, RouteContext } from "@/server/api/http";
import { UpdateOrderItemQuantityError, updateOrderItemQuantity } from "@/server/services/orders";

export async function PATCH(
  request: Request,
  context: RouteContext<{ id: string; itemId: string }>,
) {
  try {
    const params = orderItemRouteParamsSchema.parse(await context.params);
    const body = updateOrderItemQuantitySchema.parse(await request.json());

    const order = await updateOrderItemQuantity({
      orderId: params.id,
      itemId: params.itemId,
      quantity: body.quantity,
    });

    return ok(order);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return handleRouteError(badRequest("Invalid JSON body."));
    }

    if (error instanceof UpdateOrderItemQuantityError) {
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

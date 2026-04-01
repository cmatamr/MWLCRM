import { crmEntityIdParamsSchema, updateOrderDeliveryDateSchema } from "@/domain/crm/schemas";
import { badRequest, handleRouteError, notFound, ok, RouteContext } from "@/server/api/http";
import { UpdateOrderDeliveryDateError, updateOrderDeliveryDate } from "@/server/services/orders";

export async function PATCH(
  request: Request,
  context: RouteContext<{ id: string }>,
) {
  try {
    const orderId = crmEntityIdParamsSchema.parse(await context.params).id;
    const body = updateOrderDeliveryDateSchema.parse(await request.json());

    const order = await updateOrderDeliveryDate({
      orderId,
      deliveryDate: body.deliveryDate,
    });

    return ok(order);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return handleRouteError(badRequest("Invalid JSON body."));
    }

    if (error instanceof UpdateOrderDeliveryDateError) {
      if (error.code === "ORDER_NOT_FOUND") {
        return handleRouteError(notFound(error.message, error.details));
      }
    }

    return handleRouteError(error);
  }
}

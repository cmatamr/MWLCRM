import { logApiRouteError } from "@/server/observability/api-route";
import { crmEntityIdParamsSchema, updateOrderDeliveryDateSchema } from "@/domain/crm/schemas";
import { badRequest, handleRouteError, notFound, ok, RouteContext } from "@/server/api/http";
import { requireAnyRole } from "@/server/api/auth";
import { UpdateOrderDeliveryDateError, updateOrderDeliveryDate } from "@/server/services/orders";

export async function PATCH(
  request: Request,
  context: RouteContext<{ id: string }>,
) {
  try {
    await requireAnyRole(["admin", "agent"]);
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

    const response = handleRouteError(error);
    await logApiRouteError({
      request: request,
      route: "/api/orders/[id]/delivery-date",
      source: "api.orders",
      defaultEventType: "orders_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

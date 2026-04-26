import { logApiRouteError } from "@/server/observability/api-route";
import { orderItemRouteParamsSchema, updateOrderItemQuantitySchema } from "@/domain/crm/schemas";
import { badRequest, conflict, handleRouteError, notFound, ok, RouteContext } from "@/server/api/http";
import { requireAnyRole } from "@/server/api/auth";
import {
  deleteOrderItem,
  DeleteOrderItemError,
  UpdateOrderItemQuantityError,
  updateOrderItemQuantity,
} from "@/server/services/orders";

export async function PATCH(
  request: Request,
  context: RouteContext<{ id: string; itemId: string }>,
) {
  try {
    await requireAnyRole(["admin", "agent"]);
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

      if (
        error.code === "PRICING_MANUAL_REQUIRED" ||
        error.code === "PRICING_MIN_QTY_NOT_MET" ||
        error.code === "PRICING_CONFIGURATION_INVALID" ||
        error.code === "PRICING_NON_LINEAR_UNSUPPORTED"
      ) {
        return handleRouteError(badRequest(error.message, error.details));
      }
    }

    const response = handleRouteError(error);
    await logApiRouteError({
      request: request,
      route: "/api/orders/[id]/items/[itemId]",
      source: "api.orders",
      defaultEventType: "orders_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<{ id: string; itemId: string }>,
) {
  try {
    await requireAnyRole(["admin", "agent"]);
    const params = orderItemRouteParamsSchema.parse(await context.params);

    const order = await deleteOrderItem({
      orderId: params.id,
      itemId: params.itemId,
    });

    return ok(order);
  } catch (error) {
    if (error instanceof DeleteOrderItemError) {
      if (
        error.code === "ORDER_NOT_FOUND" ||
        error.code === "ITEM_NOT_FOUND" ||
        error.code === "ITEM_NOT_IN_ORDER"
      ) {
        return handleRouteError(notFound(error.message, error.details));
      }

      if (error.code === "LAST_ITEM_BLOCKED") {
        return handleRouteError(conflict(error.message, error.details));
      }
    }

    const response = handleRouteError(error);
    await logApiRouteError({
      request: _request,
      route: "/api/orders/[id]/items/[itemId]",
      source: "api.orders",
      defaultEventType: "orders_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

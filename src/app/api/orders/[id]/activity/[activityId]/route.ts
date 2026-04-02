import { conflict, handleRouteError, notFound, ok, RouteContext, badRequest } from "@/server/api/http";
import { orderActivityRouteParamsSchema, updateOrderActivitySchema } from "@/domain/crm/schemas";
import {
  deleteOrderActivity,
  DeleteOrderActivityError,
  updateOrderActivity,
  UpdateOrderActivityError,
} from "@/server/services/orders";

export async function PATCH(
  request: Request,
  context: RouteContext<{ id: string; activityId: string }>,
) {
  try {
    const params = orderActivityRouteParamsSchema.parse(await context.params);
    const body = updateOrderActivitySchema.parse(await request.json());
    const order = await updateOrderActivity({
      orderId: params.id,
      activityId: params.activityId,
      activity: body,
    });

    return ok(order);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return handleRouteError(badRequest("Invalid JSON body."));
    }

    if (error instanceof UpdateOrderActivityError) {
      if (error.code === "ORDER_NOT_FOUND" || error.code === "ACTIVITY_NOT_FOUND") {
        return handleRouteError(notFound(error.message, error.details));
      }

      return handleRouteError(conflict(error.message, error.details));
    }

    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<{ id: string; activityId: string }>,
) {
  try {
    const params = orderActivityRouteParamsSchema.parse(await context.params);
    const order = await deleteOrderActivity({
      orderId: params.id,
      activityId: params.activityId,
    });

    return ok(order);
  } catch (error) {
    if (error instanceof DeleteOrderActivityError) {
      if (error.code === "ORDER_NOT_FOUND" || error.code === "ACTIVITY_NOT_FOUND") {
        return handleRouteError(notFound(error.message, error.details));
      }

      return handleRouteError(conflict(error.message, error.details));
    }

    return handleRouteError(error);
  }
}

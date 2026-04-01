import { crmEntityIdParamsSchema, orderPaymentActionSchema } from "@/domain/crm/schemas";
import {
  badRequest,
  conflict,
  handleRouteError,
  notFound,
  ok,
  RouteContext,
} from "@/server/api/http";
import {
  confirmOrderPayment,
  ConfirmOrderPaymentError,
  deleteOrder,
  DeleteOrderError,
  getOrderDetail,
} from "@/server/services/orders";

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

export async function PATCH(request: Request, context: RouteContext<{ id: string }>) {
  try {
    const orderId = crmEntityIdParamsSchema.parse(await context.params).id;
    const body = orderPaymentActionSchema.parse(await request.json());

    if (body.action !== "confirm_payment") {
      throw badRequest("Unsupported order action.", {
        action: body.action,
      });
    }

    const result = await confirmOrderPayment(orderId);
    return ok(result);
  } catch (error) {
    if (error instanceof ConfirmOrderPaymentError) {
      if (error.code === "ORDER_NOT_FOUND") {
        return handleRouteError(notFound(error.message, error.details));
      }

      return handleRouteError(conflict(error.message, error.details));
    }

    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext<{ id: string }>) {
  try {
    const orderId = crmEntityIdParamsSchema.parse(await context.params).id;
    const result = await deleteOrder(orderId);

    return ok(result);
  } catch (error) {
    if (error instanceof DeleteOrderError) {
      if (error.code === "ORDER_NOT_FOUND") {
        return handleRouteError(notFound(error.message, error.details));
      }
    }

    return handleRouteError(error);
  }
}

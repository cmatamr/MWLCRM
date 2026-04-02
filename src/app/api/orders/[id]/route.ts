import { crmEntityIdParamsSchema } from "@/domain/crm/schemas";
import {
  badRequest,
  handleRouteError,
  notFound,
  ok,
  RouteContext,
} from "@/server/api/http";
import {
  confirmOrderPayment,
  deleteOrder,
  DeleteOrderError,
  getOrderDetail,
  PaymentReceiptError,
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
    await request.text();
    await confirmOrderPayment(orderId);
    throw badRequest(
      "Order-level payment confirmation is deprecated. Use payment receipt validation endpoints instead.",
      { orderId, deprecated: true },
    );
  } catch (error) {
    if (error instanceof PaymentReceiptError) {
      return handleRouteError(badRequest(error.message, error.details));
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

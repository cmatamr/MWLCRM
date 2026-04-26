import { logApiRouteError } from "@/server/observability/api-route";
import { crmEntityIdParamsSchema, orderPaymentActionSchema, updateOrderSchema } from "@/domain/crm/schemas";
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
  updateOrder,
  UpdateOrderError,
} from "@/server/services/orders";
import { requireAnyRole, requireRole, requireSessionProfile } from "@/server/api/auth";

export async function GET(_request: Request, context: RouteContext<{ id: string }>) {
  try {
    await requireSessionProfile();
    const orderId = crmEntityIdParamsSchema.parse(await context.params).id;
    const order = await getOrderDetail(orderId);

    if (!order) {
      throw notFound("Order not found.", { id: orderId });
    }

    return ok(order);
  } catch (error) {
    const response = handleRouteError(error);
    await logApiRouteError({
      request: _request,
      route: "/api/orders/[id]",
      source: "api.orders",
      defaultEventType: "orders_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

export async function PATCH(request: Request, context: RouteContext<{ id: string }>) {
  try {
    await requireAnyRole(["admin", "agent"]);
    const orderId = crmEntityIdParamsSchema.parse(await context.params).id;
    const body = await request.json();
    const paymentActionParse = orderPaymentActionSchema.safeParse(body);

    if (paymentActionParse.success) {
      await confirmOrderPayment(orderId);
      throw badRequest(
        "Order-level payment confirmation is deprecated. Use payment receipt validation endpoints instead.",
        { orderId, deprecated: true },
      );
    }

    const patch = updateOrderSchema.parse(body);
    const order = await updateOrder({
      orderId,
      patch: {
        status: patch.status,
        deliveryDate: patch.deliveryDate,
      },
    });

    return ok(order);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return handleRouteError(badRequest("Invalid JSON body."));
    }

    if (error instanceof UpdateOrderError) {
      if (error.code === "ORDER_NOT_FOUND") {
        return handleRouteError(notFound(error.message, error.details));
      }

      if (error.code === "STATUS_REQUIRES_VALID_RECEIPT") {
        return handleRouteError(badRequest(error.message, error.details));
      }
    }

    if (error instanceof PaymentReceiptError) {
      return handleRouteError(badRequest(error.message, error.details));
    }

    const response = handleRouteError(error);
    await logApiRouteError({
      request: request,
      route: "/api/orders/[id]",
      source: "api.orders",
      defaultEventType: "orders_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

export async function DELETE(_request: Request, context: RouteContext<{ id: string }>) {
  try {
    await requireRole("admin");
    const orderId = crmEntityIdParamsSchema.parse(await context.params).id;
    const result = await deleteOrder(orderId);

    return ok(result);
  } catch (error) {
    if (error instanceof DeleteOrderError) {
      if (error.code === "ORDER_NOT_FOUND") {
        return handleRouteError(notFound(error.message, error.details));
      }
    }

    const response = handleRouteError(error);
    await logApiRouteError({
      request: _request,
      route: "/api/orders/[id]",
      source: "api.orders",
      defaultEventType: "orders_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

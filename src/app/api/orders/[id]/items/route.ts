import { logApiRouteError } from "@/server/observability/api-route";
import { createOrderItemSchema, crmEntityIdParamsSchema } from "@/domain/crm/schemas";
import { badRequest, conflict, handleRouteError, notFound, ok, RouteContext } from "@/server/api/http";
import { requireAnyRole } from "@/server/api/auth";
import { createOrderItem, CreateOrderItemError } from "@/server/services/orders";

export async function POST(request: Request, context: RouteContext<{ id: string }>) {
  try {
    await requireAnyRole(["admin", "agent"]);
    const orderId = crmEntityIdParamsSchema.parse(await context.params).id;
    const body = createOrderItemSchema.parse(await request.json());

    const order = await createOrderItem({
      orderId,
      productId: body.productId,
      quantity: body.quantity,
    });

    return ok(order);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return handleRouteError(badRequest("Invalid JSON body."));
    }

    if (error instanceof CreateOrderItemError) {
      if (error.code === "ORDER_NOT_FOUND" || error.code === "PRODUCT_NOT_FOUND") {
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

      if (error.code === "PRODUCT_ALREADY_IN_ORDER") {
        return handleRouteError(conflict(error.message, error.details));
      }
    }

    const response = handleRouteError(error);
    await logApiRouteError({
      request: request,
      route: "/api/orders/[id]/items",
      source: "api.orders",
      defaultEventType: "orders_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

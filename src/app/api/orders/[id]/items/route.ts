import { createOrderItemSchema, crmEntityIdParamsSchema } from "@/domain/crm/schemas";
import { badRequest, conflict, handleRouteError, notFound, ok, RouteContext } from "@/server/api/http";
import { createOrderItem, CreateOrderItemError } from "@/server/services/orders";

export async function POST(request: Request, context: RouteContext<{ id: string }>) {
  try {
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

      if (error.code === "PRODUCT_ALREADY_IN_ORDER") {
        return handleRouteError(conflict(error.message, error.details));
      }
    }

    return handleRouteError(error);
  }
}

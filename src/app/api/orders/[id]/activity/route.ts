import { createOrderActivitySchema, crmEntityIdParamsSchema } from "@/domain/crm/schemas";
import { badRequest, handleRouteError, notFound, ok, RouteContext } from "@/server/api/http";
import { createOrderActivity, CreateOrderActivityError } from "@/server/services/orders";

export async function POST(
  request: Request,
  context: RouteContext<{ id: string }>,
) {
  try {
    const orderId = crmEntityIdParamsSchema.parse(await context.params).id;
    const body = createOrderActivitySchema.parse(await request.json());

    const order = await createOrderActivity({
      orderId,
      activity: body,
    });

    return ok(order, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return handleRouteError(badRequest("Invalid JSON body."));
    }

    if (error instanceof CreateOrderActivityError) {
      if (error.code === "ORDER_NOT_FOUND") {
        return handleRouteError(notFound(error.message, error.details));
      }
    }

    return handleRouteError(error);
  }
}

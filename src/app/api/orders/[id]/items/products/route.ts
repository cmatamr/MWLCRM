import { crmEntityIdParamsSchema } from "@/domain/crm/schemas";
import { handleRouteError, notFound, ok, RouteContext } from "@/server/api/http";
import { requireSessionProfile } from "@/server/api/auth";
import { CreateOrderItemError, listOrderItemProductOptions } from "@/server/services/orders";

export async function GET(request: Request, context: RouteContext<{ id: string }>) {
  try {
    await requireSessionProfile();
    const orderId = crmEntityIdParamsSchema.parse(await context.params).id;
    const query = new URL(request.url).searchParams.get("query")?.trim() ?? undefined;

    const options = await listOrderItemProductOptions({
      orderId,
      query,
    });

    return ok(options);
  } catch (error) {
    if (error instanceof CreateOrderItemError && error.code === "ORDER_NOT_FOUND") {
      return handleRouteError(notFound(error.message, error.details));
    }

    return handleRouteError(error);
  }
}

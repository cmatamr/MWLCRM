import { createOrderSchema, listOrdersParamsSchema, parseQueryParams } from "@/domain/crm/schemas";
import { badRequest, conflict, handleRouteError, notFound, ok } from "@/server/api/http";
import { createOrder, CreateOrderError, listOrders } from "@/server/services/orders";

export async function GET(request: Request) {
  try {
    const orders = await listOrders(
      parseQueryParams(listOrdersParamsSchema, new URL(request.url).searchParams),
    );
    return ok(orders);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = createOrderSchema.parse(await request.json());
    const order = await createOrder(body);

    return ok(order, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return handleRouteError(badRequest("Invalid JSON body."));
    }

    if (error instanceof CreateOrderError) {
      if (error.code === "CUSTOMER_NOT_FOUND" || error.code === "PRODUCT_NOT_FOUND") {
        return handleRouteError(notFound(error.message, error.details));
      }

      if (error.code === "CUSTOMER_WITHOUT_CONVERSATION" || error.code === "DUPLICATE_PRODUCT") {
        return handleRouteError(conflict(error.message, error.details));
      }
    }

    return handleRouteError(error);
  }
}

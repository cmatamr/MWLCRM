import { listCustomersParamsSchema, parseQueryParams } from "@/domain/crm/schemas";
import { handleRouteError, ok } from "@/server/api/http";
import { listCustomers } from "@/server/services/customers";

export async function GET(request: Request) {
  try {
    const customers = await listCustomers(
      parseQueryParams(listCustomersParamsSchema, new URL(request.url).searchParams),
    );
    return ok(customers);
  } catch (error) {
    return handleRouteError(error);
  }
}

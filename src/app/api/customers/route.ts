import { logApiRouteError } from "@/server/observability/api-route";
export const dynamic = "force-dynamic";

import {
  createCustomerSchema,
  listCustomersParamsSchema,
  parseQueryParams,
} from "@/domain/crm/schemas";
import { badRequest, conflict, handleRouteError, ok } from "@/server/api/http";
import { requireAnyRole, requireSessionProfile } from "@/server/api/auth";
import { CreateCustomerError, createCustomer, listCustomers } from "@/server/services/customers";

export async function GET(request: Request) {
  try {
    await requireSessionProfile();
    const customers = await listCustomers(
      parseQueryParams(listCustomersParamsSchema, new URL(request.url).searchParams),
    );
    return ok(customers);
  } catch (error) {
    const response = handleRouteError(error);
    await logApiRouteError({
      request: request,
      route: "/api/customers",
      source: "api.customers",
      defaultEventType: "customers_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

export async function POST(request: Request) {
  try {
    await requireAnyRole(["admin", "agent"]);
    const payload = createCustomerSchema.parse(await request.json());
    const customer = await createCustomer(payload);
    return ok(customer, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return handleRouteError(badRequest("Invalid JSON body."));
    }

    if (error instanceof CreateCustomerError) {
      return handleRouteError(conflict(error.message, error.details));
    }

    const response = handleRouteError(error);
    await logApiRouteError({
      request: request,
      route: "/api/customers",
      source: "api.customers",
      defaultEventType: "customers_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

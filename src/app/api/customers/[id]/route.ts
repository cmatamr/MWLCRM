import { logApiRouteError } from "@/server/observability/api-route";
export const dynamic = "force-dynamic";

import { crmEntityIdParamsSchema, updateCustomerSchema } from "@/domain/crm/schemas";
import {
  badRequest,
  conflict,
  handleRouteError,
  notFound,
  ok,
  RouteContext,
} from "@/server/api/http";
import { requireAnyRole, requireSessionProfile } from "@/server/api/auth";
import { getCustomerDetail, UpdateCustomerError, updateCustomer } from "@/server/services/customers";

export async function GET(_request: Request, context: RouteContext<{ id: string }>) {
  try {
    await requireSessionProfile();
    const customerId = crmEntityIdParamsSchema.parse(await context.params).id;
    const customer = await getCustomerDetail(customerId);

    if (!customer) {
      throw notFound("Customer not found.", { id: customerId });
    }

    return ok(customer);
  } catch (error) {
    const response = handleRouteError(error);
    await logApiRouteError({
      request: _request,
      route: "/api/customers/[id]",
      source: "api.customers",
      defaultEventType: "customers_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

export async function PATCH(request: Request, context: RouteContext<{ id: string }>) {
  try {
    await requireAnyRole(["admin", "agent"]);
    const customerId = crmEntityIdParamsSchema.parse(await context.params).id;
    const payload = updateCustomerSchema.parse(await request.json());
    const customer = await updateCustomer(customerId, payload);

    if (!customer) {
      throw notFound("Customer not found.", { id: customerId });
    }

    return ok(customer);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return handleRouteError(badRequest("Invalid JSON body."));
    }

    if (error instanceof UpdateCustomerError) {
      if (error.code === "DUPLICATE_CUSTOMER") {
        return handleRouteError(conflict(error.message, error.details));
      }

      return handleRouteError(badRequest(error.message, error.details));
    }

    const response = handleRouteError(error);
    await logApiRouteError({
      request: request,
      route: "/api/customers/[id]",
      source: "api.customers",
      defaultEventType: "customers_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

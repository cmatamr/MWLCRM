import { crmEntityIdParamsSchema, updateCustomerSchema } from "@/domain/crm/schemas";
import {
  badRequest,
  conflict,
  handleRouteError,
  notFound,
  ok,
  RouteContext,
} from "@/server/api/http";
import { getCustomerDetail, UpdateCustomerError, updateCustomer } from "@/server/services/customers";

export async function GET(_request: Request, context: RouteContext<{ id: string }>) {
  try {
    const customerId = crmEntityIdParamsSchema.parse(await context.params).id;
    const customer = await getCustomerDetail(customerId);

    if (!customer) {
      throw notFound("Customer not found.", { id: customerId });
    }

    return ok(customer);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext<{ id: string }>) {
  try {
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

    return handleRouteError(error);
  }
}

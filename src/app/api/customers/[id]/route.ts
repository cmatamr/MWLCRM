import { crmEntityIdParamsSchema } from "@/domain/crm/schemas";
import {
  handleRouteError,
  notFound,
  ok,
  RouteContext,
} from "@/server/api/http";
import { getCustomerDetail } from "@/server/services/customers";

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

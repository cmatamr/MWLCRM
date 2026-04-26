import { logApiRouteError } from "@/server/observability/api-route";
export const dynamic = "force-dynamic";

import { badRequest, handleRouteError, ok, type RouteContext } from "@/server/api/http";
import { requireRole } from "@/server/api/auth";
import { deleteProductAlias } from "@/server/services/products";

function parseAliasId(rawValue: string): number {
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw badRequest('Route param "aliasId" must be a positive integer.', {
      key: "aliasId",
      value: rawValue,
    });
  }
  return parsed;
}

export async function DELETE(
  _request: Request,
  context: RouteContext<{ id: string; aliasId: string }>,
) {
  try {
    await requireRole("admin");
    const { id, aliasId } = await context.params;

    if (!id?.trim()) {
      throw badRequest('Route param "id" is required.');
    }

    const product = await deleteProductAlias(id.trim(), parseAliasId(aliasId));
    return ok(product);
  } catch (error) {
    const response = handleRouteError(error);
    await logApiRouteError({
      request: _request,
      route: "/api/products/[id]/aliases/[aliasId]",
      source: "api.products",
      defaultEventType: "products_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

import { badRequest, handleRouteError, ok, type RouteContext } from "@/server/api/http";
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
    const { id, aliasId } = await context.params;

    if (!id?.trim()) {
      throw badRequest('Route param "id" is required.');
    }

    const product = await deleteProductAlias(id.trim(), parseAliasId(aliasId));
    return ok(product);
  } catch (error) {
    return handleRouteError(error);
  }
}

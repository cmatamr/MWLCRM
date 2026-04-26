import { logApiRouteError } from "@/server/observability/api-route";
export const dynamic = "force-dynamic";

import { badRequest, handleRouteError, ok, type RouteContext } from "@/server/api/http";
import { requireRole } from "@/server/api/auth";
import { addProductAlias } from "@/server/services/products";
import { z } from "zod";

const addAliasSchema = z
  .object({
    alias: z.string().trim().min(1).max(120),
  })
  .strict();

export async function POST(
  request: Request,
  context: RouteContext<{ id: string }>,
) {
  try {
    await requireRole("admin");
    const { id } = await context.params;

    if (!id?.trim()) {
      throw badRequest('Route param "id" is required.');
    }

    const body = addAliasSchema.parse(await request.json());
    const product = await addProductAlias(id.trim(), body);

    return ok(product);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return handleRouteError(badRequest("Invalid JSON body."));
    }

    const response = handleRouteError(error);
    await logApiRouteError({
      request: request,
      route: "/api/products/[id]/aliases",
      source: "api.products",
      defaultEventType: "products_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

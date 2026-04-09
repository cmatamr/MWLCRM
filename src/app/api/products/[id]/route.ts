import {
  ApiRouteError,
  badRequest,
  handleRouteError,
  ok,
  type RouteContext,
} from "@/server/api/http";
import { requireRole, requireSessionProfile } from "@/server/api/auth";
import { getProductDetail } from "@/server/services/products";

export async function GET(
  _request: Request,
  context: RouteContext<{ id: string }>,
) {
  try {
    await requireSessionProfile();
    const { id } = await context.params;

    if (!id?.trim()) {
      throw badRequest('Route param "id" is required.');
    }

    const product = await getProductDetail(id.trim());
    return ok(product);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(
  _request: Request,
  context: RouteContext<{ id: string }>,
) {
  try {
    await requireRole("admin");
    const { id } = await context.params;

    if (!id?.trim()) {
      throw badRequest('Route param "id" is required.');
    }

    throw new ApiRouteError({
      status: 410,
      code: "DEPRECATED_ROUTE",
      message:
        "PATCH /api/products/:id is deprecated. Use POST /api/products/save with product_id and publication_mode to enforce NOVA publication contract.",
      details: {
        deprecated_route: "PATCH /api/products/:id",
        replacement_route: "POST /api/products/save",
        required_fields: ["product_id", "publication_mode", "product"],
        allowed_publication_mode: ["internal", "nova"],
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

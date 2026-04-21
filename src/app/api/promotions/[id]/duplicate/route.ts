import { handleRouteError, ok, parseUuidRouteParam, type RouteContext } from "@/server/api/http";
import { requireRole } from "@/server/api/auth";
import { duplicatePromotion } from "@/server/services/promotions";

export async function POST(_request: Request, context: RouteContext<{ id: string }>) {
  try {
    await requireRole("admin");
    const id = await parseUuidRouteParam(context);

    const duplicated = await duplicatePromotion(id);
    return ok(duplicated, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

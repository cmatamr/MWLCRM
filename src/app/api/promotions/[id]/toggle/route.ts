import { z } from "zod";

import { handleRouteError, ok, parseUuidRouteParam, type RouteContext } from "@/server/api/http";
import { requireRole } from "@/server/api/auth";
import { setPromotionEnabled } from "@/server/services/promotions";

const toggleSchema = z.object({
  is_enabled: z.boolean(),
});

export async function POST(request: Request, context: RouteContext<{ id: string }>) {
  try {
    await requireRole("admin");
    const id = await parseUuidRouteParam(context);

    const body = toggleSchema.parse(await request.json());
    const updated = await setPromotionEnabled(id, body);
    return ok(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}

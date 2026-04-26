import { logApiRouteError } from "@/server/observability/api-route";
export const dynamic = "force-dynamic";

import { badRequest, handleRouteError, ok, type RouteContext } from "@/server/api/http";
import { requireRole } from "@/server/api/auth";
import { addProductSearchTerm } from "@/server/services/products";
import {
  isSearchTermUsefulForNova,
  NOVA_SEARCH_TERM_QUALITY_RULE_EN,
} from "@/lib/products/search-term-quality";
import { z } from "zod";

const searchTermTypeEnum = z.enum(["alias"]);
// NOTE(Fase3): keep term_type fixed to "alias" until DB/search semantics
// formally support additional types.

const addSearchTermSchema = z
  .object({
    term: z.string().trim().min(1).max(120),
    term_type: searchTermTypeEnum.default("alias"),
    priority: z.number().int().min(1).max(1000).optional(),
    is_active: z.boolean().optional(),
    notes: z.string().max(500).optional().nullable(),
  })
  .refine(
    (value) => value.is_active === false || isSearchTermUsefulForNova(value.term),
    { message: NOVA_SEARCH_TERM_QUALITY_RULE_EN, path: ["term"] },
  )
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

    const body = addSearchTermSchema.parse(await request.json());
    const product = await addProductSearchTerm(id.trim(), body);

    return ok(product);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return handleRouteError(badRequest("Invalid JSON body."));
    }

    const response = handleRouteError(error);
    await logApiRouteError({
      request: request,
      route: "/api/products/[id]/search-terms",
      source: "api.products",
      defaultEventType: "products_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

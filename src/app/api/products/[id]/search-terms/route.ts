import { badRequest, handleRouteError, ok, type RouteContext } from "@/server/api/http";
import { addProductSearchTerm } from "@/server/services/products";
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
  .strict();

export async function POST(
  request: Request,
  context: RouteContext<{ id: string }>,
) {
  try {
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

    return handleRouteError(error);
  }
}

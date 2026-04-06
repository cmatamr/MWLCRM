import { badRequest, handleRouteError, ok, type RouteContext } from "@/server/api/http";
import { requireRole } from "@/server/api/auth";
import { deleteProductSearchTerm, updateProductSearchTerm } from "@/server/services/products";
import { z } from "zod";

const searchTermTypeEnum = z.enum(["alias"]);
// NOTE(Fase3): keep term_type fixed to "alias" until DB/search semantics
// formally support additional types.

const updateSearchTermSchema = z
  .object({
    term: z.string().trim().min(1).max(120).optional(),
    term_type: searchTermTypeEnum.optional(),
    priority: z.number().int().min(1).max(1000).optional(),
    is_active: z.boolean().optional(),
    notes: z.string().max(500).optional().nullable(),
  })
  .strict()
  .refine((value) => Object.values(value).some((fieldValue) => fieldValue !== undefined), {
    message: "At least one search term field must be provided.",
  });

function parseTermId(rawValue: string): number {
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw badRequest('Route param "termId" must be a positive integer.', {
      key: "termId",
      value: rawValue,
    });
  }
  return parsed;
}

export async function PATCH(
  request: Request,
  context: RouteContext<{ id: string; termId: string }>,
) {
  try {
    await requireRole("admin");
    const { id, termId } = await context.params;

    if (!id?.trim()) {
      throw badRequest('Route param "id" is required.');
    }

    const body = updateSearchTermSchema.parse(await request.json());
    const product = await updateProductSearchTerm(id.trim(), parseTermId(termId), body);

    return ok(product);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return handleRouteError(badRequest("Invalid JSON body."));
    }

    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<{ id: string; termId: string }>,
) {
  try {
    await requireRole("admin");
    const { id, termId } = await context.params;

    if (!id?.trim()) {
      throw badRequest('Route param "id" is required.');
    }

    const product = await deleteProductSearchTerm(id.trim(), parseTermId(termId));
    return ok(product);
  } catch (error) {
    return handleRouteError(error);
  }
}

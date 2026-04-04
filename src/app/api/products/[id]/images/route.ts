import { badRequest, handleRouteError, ok, type RouteContext } from "@/server/api/http";
import { addProductImage } from "@/server/services/products";
import { z } from "zod";

const addProductImageSchema = z
  .object({
    storage_bucket: z.string().trim().min(1).optional(),
    storage_path: z.string().trim().min(1),
    alt_text: z.string().optional().nullable(),
    is_primary: z.boolean().optional(),
    sort_order: z.number().int().min(0).optional(),
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

    const body = addProductImageSchema.parse(await request.json());
    const product = await addProductImage(id.trim(), body);

    return ok(product);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return handleRouteError(badRequest("Invalid JSON body."));
    }

    return handleRouteError(error);
  }
}

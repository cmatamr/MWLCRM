import { badRequest, handleRouteError, ok, type RouteContext } from "@/server/api/http";
import { requireRole } from "@/server/api/auth";
import { deleteProductImage, updateProductImage } from "@/server/services/products";
import { z } from "zod";

const updateProductImageSchema = z
  .object({
    alt_text: z.string().optional().nullable(),
    is_primary: z.boolean().optional(),
    sort_order: z.number().int().min(0).optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((fieldValue) => fieldValue !== undefined), {
    message: "At least one image field must be provided.",
  });

function parseImageId(rawValue: string): number {
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw badRequest('Route param "imageId" must be a positive integer.', {
      key: "imageId",
      value: rawValue,
    });
  }
  return parsed;
}

export async function PATCH(
  request: Request,
  context: RouteContext<{ id: string; imageId: string }>,
) {
  try {
    await requireRole("admin");
    const { id, imageId } = await context.params;

    if (!id?.trim()) {
      throw badRequest('Route param "id" is required.');
    }

    const body = updateProductImageSchema.parse(await request.json());
    const product = await updateProductImage(id.trim(), parseImageId(imageId), body);

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
  context: RouteContext<{ id: string; imageId: string }>,
) {
  try {
    await requireRole("admin");
    const { id, imageId } = await context.params;

    if (!id?.trim()) {
      throw badRequest('Route param "id" is required.');
    }

    const product = await deleteProductImage(id.trim(), parseImageId(imageId));
    return ok(product);
  } catch (error) {
    return handleRouteError(error);
  }
}

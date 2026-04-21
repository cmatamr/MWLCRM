import { badRequest, handleRouteError, ok } from "@/server/api/http";
import { requireRole } from "@/server/api/auth";
import { previewProductSku } from "@/server/services/products";
import { z } from "zod";

const skuPreviewPayloadSchema = z
  .object({
    category: z.string().trim().min(1),
    family: z.string().trim().min(1),
    variant_label: z.string().optional().nullable(),
    size_label: z.string().optional().nullable(),
    material: z.string().optional().nullable(),
  })
  .strict();

export async function POST(request: Request) {
  try {
    await requireRole("admin");
    const rawBody = await request.json();

    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      throw badRequest("Invalid JSON body.");
    }

    const payload = skuPreviewPayloadSchema.parse(rawBody);
    const preview = await previewProductSku(payload);
    return ok(preview);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return handleRouteError(badRequest("Invalid JSON body."));
    }

    return handleRouteError(error);
  }
}

import { badRequest, handleRouteError, ok, type RouteContext } from "@/server/api/http";
import { getProductDetail, updateProduct } from "@/server/services/products";
import { z } from "zod";

const updateProductPayloadSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    variant_label: z.string().optional().nullable(),
    size_label: z.string().optional().nullable(),
    material: z.string().optional().nullable(),
    base_color: z.string().optional().nullable(),
    print_type: z.string().optional().nullable(),
    personalization_area: z.string().optional().nullable(),
    summary: z.string().optional().nullable(),
    details: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    pricing_mode: z.enum(["fixed", "from", "variable"]).optional(),
    price_crc: z.number().int().min(0).optional().nullable(),
    price_from_crc: z.number().int().min(0).optional().nullable(),
    min_qty: z.number().int().min(1).optional().nullable(),
    is_active: z.boolean().optional(),
    is_agent_visible: z.boolean().optional(),
    allows_name: z.boolean().optional(),
    includes_design_adjustment_count: z.number().int().min(0).optional(),
    extra_adjustment_has_cost: z.boolean().optional(),
    requires_design_approval: z.boolean().optional(),
    is_full_color: z.boolean().optional(),
    is_premium: z.boolean().optional(),
    is_discountable: z.boolean().optional(),
    discount_visibility: z
      .enum(["never", "only_if_customer_requests", "internal_only", "always"])
      .optional(),
    search_boost: z.number().int().optional(),
    sort_order: z.number().int().min(0).optional(),
  })
  .strip();

export async function GET(
  _request: Request,
  context: RouteContext<{ id: string }>,
) {
  try {
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
  request: Request,
  context: RouteContext<{ id: string }>,
) {
  try {
    const { id } = await context.params;

    if (!id?.trim()) {
      throw badRequest('Route param "id" is required.');
    }

    const rawBody = await request.json();
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      throw badRequest("Invalid JSON body.");
    }

    const payload = updateProductPayloadSchema.parse(rawBody);
    const product = await updateProduct(id.trim(), payload);
    return ok(product);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return handleRouteError(badRequest("Invalid JSON body."));
    }

    return handleRouteError(error);
  }
}

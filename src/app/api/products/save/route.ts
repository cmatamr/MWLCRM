import { logApiRouteError } from "@/server/observability/api-route";
import { badRequest, handleRouteError, ok } from "@/server/api/http";
import { requireRole } from "@/server/api/auth";
import { saveProduct } from "@/server/services/products";
import {
  isSearchTermUsefulForNova,
  NOVA_SEARCH_TERM_QUALITY_RULE_EN,
} from "@/lib/products/search-term-quality";
import { z } from "zod";

const POSTGRES_INT4_MAX = 2_147_483_647;

const productPayloadSchema = z
  .object({
    name: z.string().trim().min(1).max(180),
    category: z.string().trim().min(1),
    family: z.string().trim().min(1),
    pricing_mode: z.enum(["fixed", "range", "variable"]),
    price_crc: z.number().int().min(0).optional().nullable(),
    price_from_crc: z.number().int().min(0).optional().nullable(),
    min_qty: z.number().int().min(1),
    is_active: z.boolean().optional(),
    variant_label: z.string().optional().nullable(),
    size_label: z.string().optional().nullable(),
    material: z.string().optional().nullable(),
    base_color: z.string().optional().nullable(),
    print_type: z.string().optional().nullable(),
    personalization_area: z.string().optional().nullable(),
    summary: z.string().optional().nullable(),
    details: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
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
  .strict();

const saveProductPayloadSchema = z
  .object({
    product_id: z.string().trim().min(1).optional().nullable(),
    publication_mode: z.enum(["internal", "nova"]),
    product: productPayloadSchema,
    aliases: z
      .array(
        z
          .object({
            alias: z.string().trim().min(1).max(120),
          })
          .strict(),
      )
      .optional(),
    search_terms: z
      .array(
        z
          .object({
            id: z.number().int().optional().nullable(),
            term: z.string().trim().min(1).max(120),
            term_type: z.enum(["alias"]).optional(),
            priority: z.number().int().min(1).max(1000).optional(),
            is_active: z.boolean().optional(),
            notes: z.string().max(500).optional().nullable(),
          })
          .refine(
            (value) =>
              value.is_active === false || isSearchTermUsefulForNova(value.term),
            { message: NOVA_SEARCH_TERM_QUALITY_RULE_EN, path: ["term"] },
          )
          .strict(),
      )
      .optional(),
    range_prices: z
      .array(
        z
          .object({
            id: z.number().int().optional().nullable(),
            range_min_qty: z.number().int().min(1).max(POSTGRES_INT4_MAX),
            range_max_qty: z.number().int().min(1).max(POSTGRES_INT4_MAX).optional().nullable(),
            unit_price_crc: z.number().int().min(1).max(POSTGRES_INT4_MAX),
            sort_order: z.number().int().min(0).max(POSTGRES_INT4_MAX).optional(),
            is_active: z.boolean().optional(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

export async function POST(request: Request) {
  try {
    await requireRole("admin");
    const rawBody = await request.json();

    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      throw badRequest("Invalid JSON body.");
    }

    const payload = saveProductPayloadSchema.parse(rawBody);
    const result = await saveProduct(payload);

    return ok(result);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return handleRouteError(badRequest("Invalid JSON body."));
    }

    const response = handleRouteError(error);
    await logApiRouteError({
      request: request,
      route: "/api/products/save",
      source: "api.products",
      defaultEventType: "products_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

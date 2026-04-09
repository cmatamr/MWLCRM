import { badRequest, handleRouteError, ok } from "@/server/api/http";
import { requireRole } from "@/server/api/auth";
import { saveProduct } from "@/server/services/products";
import {
  isSearchTermUsefulForNova,
  NOVA_SEARCH_TERM_QUALITY_RULE_EN,
} from "@/lib/products/search-term-quality";
import { z } from "zod";

const productPayloadSchema = z
  .object({
    name: z.string().trim().min(1).max(180),
    category: z.string().trim().min(1),
    family: z.string().trim().min(1),
    pricing_mode: z.enum(["fixed", "from", "variable"]),
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
    images: z
      .array(
        z
          .object({
            id: z.number().int().optional().nullable(),
            storage_bucket: z.string().trim().min(1).optional(),
            storage_path: z.string().trim().min(1),
            alt_text: z.string().max(300).optional().nullable(),
            is_primary: z.boolean().optional(),
            sort_order: z.number().int().min(0).optional(),
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

    return handleRouteError(error);
  }
}

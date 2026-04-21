import { z } from "zod";

import {
  badRequest,
  handleRouteError,
  ok,
  parsePositiveIntParam,
  parseStringParam,
} from "@/server/api/http";
import { requireRole, requireSessionProfile } from "@/server/api/auth";
import {
  createPromotion,
  listPromotions,
  type ListPromotionsParams,
  type SavePromotionInput,
} from "@/server/services/promotions";

const promoTypeSchema = z.enum(["blocks", "ranges"]);

const blockPriceSchema = z.object({
  exact_qty: z.number().int(),
  total_price_crc: z.number().int(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

const rangePriceSchema = z.object({
  range_min_qty: z.number().int(),
  range_max_qty: z.number().int().nullable(),
  unit_price_crc: z.number().int(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

const savePromotionSchema = z.object({
  product_id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  promo_type: promoTypeSchema,
  is_enabled: z.boolean(),
  agent_visible: z.boolean(),
  starts_at: z.string().trim().min(1),
  ends_at: z.string().trim().min(1),
  timezone_name: z.string().trim().min(1),
  min_promo_qty: z.number().int(),
  block_size: z.number().int().nullable().optional(),
  top_block_qty: z.number().int().nullable().optional(),
  post_top_block_price_crc: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
  block_prices: z.array(blockPriceSchema).optional(),
  range_prices: z.array(rangePriceSchema).optional(),
});

function parseBooleanParam(searchParams: URLSearchParams, key: string): boolean | undefined {
  const value = parseStringParam(searchParams, key);

  if (value == null) {
    return undefined;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw badRequest(`Query param "${key}" debe ser "true" o "false".`);
}

export async function GET(request: Request) {
  try {
    await requireSessionProfile();
    const searchParams = new URL(request.url).searchParams;

    const promoType = parseStringParam(searchParams, "promo_type");
    if (promoType && promoType !== "blocks" && promoType !== "ranges") {
      throw badRequest("Query param \"promo_type\" inválido.");
    }

    const status = parseStringParam(searchParams, "status");
    const allowedStatus = ["all", "active_current", "scheduled", "expired", "inactive", "integrity_error"];
    if (status && !allowedStatus.includes(status)) {
      throw badRequest("Query param \"status\" inválido.", { allowedStatus });
    }

    const params: ListPromotionsParams = {
      page: parsePositiveIntParam(searchParams, "page"),
      pageSize: parsePositiveIntParam(searchParams, "page_size"),
      search: parseStringParam(searchParams, "search"),
      promoType: promoType as "blocks" | "ranges" | undefined,
      status: status as ListPromotionsParams["status"],
      agentVisible: parseBooleanParam(searchParams, "agent_visible"),
      isEnabled: parseBooleanParam(searchParams, "is_enabled"),
    };

    const response = await listPromotions(params);
    return ok(response);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("admin");

    const body = (await request.json()) as SavePromotionInput;
    const parsed = savePromotionSchema.parse(body);

    const created = await createPromotion(parsed);
    return ok(created, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

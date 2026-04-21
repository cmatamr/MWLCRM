import { z } from "zod";

import { handleRouteError, ok, parseUuidRouteParam, type RouteContext } from "@/server/api/http";
import { requireRole, requireSessionProfile } from "@/server/api/auth";
import {
  deletePromotion,
  getPromotionDetail,
  updatePromotion,
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

export async function GET(_request: Request, context: RouteContext<{ id: string }>) {
  try {
    await requireSessionProfile();
    const id = await parseUuidRouteParam(context);

    const detail = await getPromotionDetail(id);
    return ok(detail);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext<{ id: string }>) {
  try {
    await requireRole("admin");
    const id = await parseUuidRouteParam(context);

    const body = (await request.json()) as SavePromotionInput;
    const parsed = savePromotionSchema.parse(body);

    const updated = await updatePromotion(id, parsed);
    return ok(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext<{ id: string }>) {
  try {
    await requireRole("admin");
    const id = await parseUuidRouteParam(context);

    const deleted = await deletePromotion(id);
    return ok(deleted);
  } catch (error) {
    return handleRouteError(error);
  }
}

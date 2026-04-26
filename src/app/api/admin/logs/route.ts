import { z } from "zod";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { badRequest, handleRouteError, ok } from "@/server/api/http";
import { logAdminApiError } from "@/server/observability/admin-api";
import { requireAdminSecurityContext } from "@/server/security/admin";

const levelSchema = z.enum(["debug", "info", "warn", "error", "critical"]);

const querySchema = z.object({
  level: levelSchema.optional(),
  source: z.string().trim().min(1).max(120).optional(),
  event_type: z.string().trim().min(1).max(120).optional(),
  correlation_id: z.string().trim().min(1).max(200).optional(),
  lead_id: z.string().uuid().optional(),
  thread_id: z.string().uuid().optional(),
  search: z.string().trim().min(1).max(300).optional(),
  date_from: z.string().trim().optional(),
  date_to: z.string().trim().optional(),
});

function parseDateParam(value: string | undefined, key: string, endOfDay = false): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return endOfDay ? `${trimmed}T23:59:59.999Z` : `${trimmed}T00:00:00.000Z`;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw badRequest(`El parametro ${key} no es una fecha valida.`, { key, value: trimmed });
  }

  return date.toISOString();
}

export const runtime = "nodejs";

export async function GET(request: Request) {
  let adminUserId: string | null = null;

  try {
    const { user } = await requireAdminSecurityContext();
    adminUserId = user.id;

    const url = new URL(request.url);
    const query = querySchema.parse({
      level: url.searchParams.get("level") ?? undefined,
      source: url.searchParams.get("source") ?? undefined,
      event_type: url.searchParams.get("event_type") ?? undefined,
      correlation_id: url.searchParams.get("correlation_id") ?? undefined,
      lead_id: url.searchParams.get("lead_id") ?? undefined,
      thread_id: url.searchParams.get("thread_id") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      date_from: url.searchParams.get("date_from") ?? undefined,
      date_to: url.searchParams.get("date_to") ?? undefined,
    });

    const dateFrom = parseDateParam(query.date_from, "date_from");
    const dateTo = parseDateParam(query.date_to, "date_to", true);

    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw badRequest("date_from no puede ser mayor que date_to.");
    }

    const service = createSupabaseServiceClient();

    let dbQuery = service
      .from("app_logs")
      .select(
        "id, created_at, level, source, event_type, message, correlation_id, request_id, user_id, lead_id, thread_id, workflow_name, node_name, external_provider, external_request_id, http_status, error_message, stack_trace, metadata",
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (query.level) {
      dbQuery = dbQuery.eq("level", query.level);
    }

    if (query.source) {
      dbQuery = dbQuery.eq("source", query.source);
    }

    if (query.event_type) {
      dbQuery = dbQuery.eq("event_type", query.event_type);
    }

    if (query.correlation_id) {
      dbQuery = dbQuery.eq("correlation_id", query.correlation_id);
    }

    if (query.lead_id) {
      dbQuery = dbQuery.eq("lead_id", query.lead_id);
    }

    if (query.thread_id) {
      dbQuery = dbQuery.eq("thread_id", query.thread_id);
    }

    if (dateFrom) {
      dbQuery = dbQuery.gte("created_at", dateFrom);
    }

    if (dateTo) {
      dbQuery = dbQuery.lte("created_at", dateTo);
    }

    if (query.search) {
      const searchTerm = `%${query.search.replaceAll(",", " ")}%`;
      dbQuery = dbQuery.or(
        [
          `message.ilike.${searchTerm}`,
          `error_message.ilike.${searchTerm}`,
          `correlation_id.ilike.${searchTerm}`,
          `request_id.ilike.${searchTerm}`,
          `external_request_id.ilike.${searchTerm}`,
        ].join(","),
      );
    }

    const { data, error } = await dbQuery;

    if (error) {
      throw badRequest("No se pudo cargar los logs.", error);
    }

    return ok({
      logs: data ?? [],
      total: (data ?? []).length,
    });
  } catch (error) {
    await logAdminApiError({
      request,
      route: "GET /api/admin/logs",
      error,
      userId: adminUserId,
    });

    return handleRouteError(error);
  }
}

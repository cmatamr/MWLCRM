import { z } from "zod";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { badRequest, handleRouteError, ok } from "@/server/api/http";
import { logAdminApiError } from "@/server/observability/admin-api";
import { requireAdminSecurityContext } from "@/server/security/admin";

const levelSchema = z.enum(["debug", "info", "warn", "error", "critical"]);
const logTypeSchema = z.enum(["all", "app_logs", "app_user_security_events"]);

const querySchema = z.object({
  log_type: logTypeSchema.optional(),
  level: levelSchema.optional(),
  source: z.string().trim().min(1).max(120).optional(),
  event_type: z.string().trim().min(1).max(120).optional(),
  correlation_id: z.string().trim().min(1).max(200).optional(),
  lead_id: z.string().uuid().optional(),
  thread_id: z.string().uuid().optional(),
  search: z.string().trim().min(1).max(300).optional(),
  date_from: z.string().trim().optional(),
  date_to: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional(),
  page_size: z.union([z.literal("all"), z.coerce.number().int().min(1).max(500)]).optional(),
});

type AppLogLevel = z.infer<typeof levelSchema>;
type UnifiedLogRow = {
  id: string;
  created_at: string;
  level: AppLogLevel;
  source: string;
  event_type: string;
  message: string;
  correlation_id: string | null;
  request_id: string | null;
  user_id: string | null;
  lead_id: string | null;
  thread_id: string | null;
  workflow_name: string | null;
  node_name: string | null;
  external_provider: string | null;
  external_request_id: string | null;
  http_status: number | null;
  error_message: string | null;
  stack_trace: string | null;
  metadata: Record<string, unknown>;
  log_type: "app_logs" | "app_user_security_events";
};

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

function classifySecurityEventLevel(eventType: string): AppLogLevel {
  const normalized = eventType.toLowerCase();
  if (
    normalized.includes("failed") ||
    normalized.includes("error") ||
    normalized.includes("denied") ||
    normalized.includes("locked") ||
    normalized.includes("forbidden")
  ) {
    return "warn";
  }

  return "info";
}

function mapSecurityEventRowToUnified(
  row: {
    id: string;
    created_at: string;
    event_type: string;
    user_id: string | null;
    actor_user_id: string | null;
    event_metadata: Record<string, unknown> | null;
    ip_address: string | null;
    user_agent: string | null;
  },
): UnifiedLogRow {
  const metadata = (row.event_metadata ?? {}) as Record<string, unknown>;

  return {
    id: row.id,
    created_at: row.created_at,
    level: classifySecurityEventLevel(row.event_type),
    source: "security.events",
    event_type: row.event_type,
    message: `Security event: ${row.event_type}`,
    correlation_id: null,
    request_id: null,
    user_id: row.user_id,
    lead_id: null,
    thread_id: null,
    workflow_name: null,
    node_name: null,
    external_provider: null,
    external_request_id: null,
    http_status: null,
    error_message: null,
    stack_trace: null,
    metadata: {
      ...metadata,
      actor_user_id: row.actor_user_id,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      table: "app_user_security_events",
    },
    log_type: "app_user_security_events",
  };
}

function mapAppLogRowToUnified(
  row: Omit<UnifiedLogRow, "log_type">,
): UnifiedLogRow {
  return {
    ...row,
    log_type: "app_logs",
  };
}

export async function GET(request: Request) {
  let adminUserId: string | null = null;

  try {
    const { user } = await requireAdminSecurityContext();
    adminUserId = user.id;

    const url = new URL(request.url);
    const query = querySchema.parse({
      log_type: url.searchParams.get("log_type") ?? undefined,
      level: url.searchParams.get("level") ?? undefined,
      source: url.searchParams.get("source") ?? undefined,
      event_type: url.searchParams.get("event_type") ?? undefined,
      correlation_id: url.searchParams.get("correlation_id") ?? undefined,
      lead_id: url.searchParams.get("lead_id") ?? undefined,
      thread_id: url.searchParams.get("thread_id") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      date_from: url.searchParams.get("date_from") ?? undefined,
      date_to: url.searchParams.get("date_to") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      page_size: url.searchParams.get("page_size") ?? undefined,
    });

    const dateFrom = parseDateParam(query.date_from, "date_from");
    const dateTo = parseDateParam(query.date_to, "date_to", true);
    const logType = query.log_type ?? "all";

    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw badRequest("date_from no puede ser mayor que date_to.");
    }

    const service = createSupabaseServiceClient();
    const unifiedLogs: UnifiedLogRow[] = [];

    if (logType === "all" || logType === "app_logs") {
      let appLogsQuery = service
        .from("app_logs")
        .select(
          "id, created_at, level, source, event_type, message, correlation_id, request_id, user_id, lead_id, thread_id, workflow_name, node_name, external_provider, external_request_id, http_status, error_message, stack_trace, metadata",
        )
        .order("created_at", { ascending: false })
        .limit(200);

      if (query.level) {
        appLogsQuery = appLogsQuery.eq("level", query.level);
      }

      if (query.source) {
        appLogsQuery = appLogsQuery.eq("source", query.source);
      }

      if (query.event_type) {
        appLogsQuery = appLogsQuery.eq("event_type", query.event_type);
      }

      if (query.correlation_id) {
        appLogsQuery = appLogsQuery.eq("correlation_id", query.correlation_id);
      }

      if (query.lead_id) {
        appLogsQuery = appLogsQuery.eq("lead_id", query.lead_id);
      }

      if (query.thread_id) {
        appLogsQuery = appLogsQuery.eq("thread_id", query.thread_id);
      }

      if (dateFrom) {
        appLogsQuery = appLogsQuery.gte("created_at", dateFrom);
      }

      if (dateTo) {
        appLogsQuery = appLogsQuery.lte("created_at", dateTo);
      }

      if (query.search) {
        const searchTerm = `%${query.search.replaceAll(",", " ")}%`;
        appLogsQuery = appLogsQuery.or(
          [
            `message.ilike.${searchTerm}`,
            `error_message.ilike.${searchTerm}`,
            `correlation_id.ilike.${searchTerm}`,
            `request_id.ilike.${searchTerm}`,
            `external_request_id.ilike.${searchTerm}`,
          ].join(","),
        );
      }

      const { data: appData, error: appError } = await appLogsQuery;
      if (appError) {
        throw badRequest("No se pudo cargar los logs de app_logs.", appError);
      }

      unifiedLogs.push(...(appData ?? []).map((row) => mapAppLogRowToUnified(row as Omit<UnifiedLogRow, "log_type">)));
    }

    if (logType === "all" || logType === "app_user_security_events") {
      let securityQuery = service
        .from("app_user_security_events")
        .select("id, created_at, event_type, user_id, actor_user_id, event_metadata, ip_address, user_agent")
        .order("created_at", { ascending: false })
        .limit(300);

      if (query.event_type) {
        securityQuery = securityQuery.eq("event_type", query.event_type);
      }

      if (dateFrom) {
        securityQuery = securityQuery.gte("created_at", dateFrom);
      }

      if (dateTo) {
        securityQuery = securityQuery.lte("created_at", dateTo);
      }

      const { data: securityData, error: securityError } = await securityQuery;
      if (securityError) {
        throw badRequest("No se pudo cargar los logs de app_user_security_events.", securityError);
      }

      let mapped = (securityData ?? []).map((row) =>
        mapSecurityEventRowToUnified(
          row as {
            id: string;
            created_at: string;
            event_type: string;
            user_id: string | null;
            actor_user_id: string | null;
            event_metadata: Record<string, unknown> | null;
            ip_address: string | null;
            user_agent: string | null;
          },
        ),
      );

      if (query.level) {
        mapped = mapped.filter((row) => row.level === query.level);
      }

      if (query.source) {
        mapped = mapped.filter((row) => row.source === query.source);
      }

      if (query.search) {
        const search = query.search.toLowerCase();
        mapped = mapped.filter((row) => {
          const metadataText = JSON.stringify(row.metadata ?? {}).toLowerCase();
          return (
            row.message.toLowerCase().includes(search) ||
            row.event_type.toLowerCase().includes(search) ||
            (row.user_id ?? "").toLowerCase().includes(search) ||
            metadataText.includes(search)
          );
        });
      }

      unifiedLogs.push(...mapped);
    }

    const sortedLogs = unifiedLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const total = sortedLogs.length;
    const requestedPage = query.page ?? 1;
    const requestedPageSize = query.page_size ?? 15;

    let pageSize: number;
    let totalPages: number;
    let currentPage: number;
    let logs: UnifiedLogRow[];

    if (requestedPageSize === "all") {
      pageSize = total > 0 ? total : 1;
      totalPages = 1;
      currentPage = 1;
      logs = sortedLogs;
    } else {
      pageSize = requestedPageSize;
      totalPages = Math.max(1, Math.ceil(total / pageSize));
      currentPage = Math.min(requestedPage, totalPages);
      const start = (currentPage - 1) * pageSize;
      logs = sortedLogs.slice(start, start + pageSize);
    }

    return ok({
      logs,
      total,
      page: currentPage,
      page_size: requestedPageSize,
      total_pages: totalPages,
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

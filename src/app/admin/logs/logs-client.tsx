"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { RefreshCw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useModalDismiss } from "@/components/ui/modal-dismiss";
import { TableEmptyStateRow } from "@/components/ui/state-display";
import { StatusBadge } from "@/components/ui/status-badge";

type AppLogLevel = "debug" | "info" | "warn" | "error" | "critical";
type LogTypeFilter = "all" | "app_logs" | "app_user_security_events";

type AppLogRow = {
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

function getLogTypeLabel(value: LogTypeFilter): string {
  if (value === "app_logs") {
    return "Aplicacion";
  }

  if (value === "app_user_security_events") {
    return "Seguridad";
  }

  return "Todos";
}

type LogsResponse = {
  success: boolean;
  data?: {
    logs: AppLogRow[];
    total: number;
    page: number;
    page_size: number | "all";
    total_pages: number;
  };
  error?: {
    message?: string;
  };
};

type LogDetailResponse = {
  success: boolean;
  data?: {
    log: AppLogRow;
  };
  error?: {
    message?: string;
  };
};

const LEVEL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "debug", label: "Debug" },
  { value: "info", label: "Info" },
  { value: "warn", label: "Warn" },
  { value: "error", label: "Error" },
  { value: "critical", label: "Critical" },
];

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

function levelTone(level: AppLogLevel): "info" | "success" | "warning" | "danger" | "neutral" {
  if (level === "critical" || level === "error") {
    return "danger";
  }

  if (level === "warn") {
    return "warning";
  }

  if (level === "info") {
    return "info";
  }

  if (level === "debug") {
    return "neutral";
  }

  return "neutral";
}

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

function DetailField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 break-all text-sm text-slate-800">{value && value.trim() ? value : "-"}</p>
    </div>
  );
}

export function AdminLogsClient() {
  const [logs, setLogs] = useState<AppLogRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState<"15" | "30" | "50" | "100" | "all">("15");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [logType, setLogType] = useState<LogTypeFilter>("all");
  const [level, setLevel] = useState("all");
  const [source, setSource] = useState("");
  const [eventType, setEventType] = useState("");
  const [search, setSearch] = useState("");
  const [correlationId, setCorrelationId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AppLogRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const canSearch = useMemo(
    () =>
      Boolean(
        search.trim() ||
          logType !== "all" ||
          source.trim() ||
          eventType.trim() ||
          correlationId.trim() ||
          dateFrom ||
          dateTo ||
          level !== "all",
      ),
    [correlationId, dateFrom, dateTo, eventType, level, logType, search, source],
  );

  const availableEventTypes = useMemo(() => {
    const rows =
      logType === "all" ? logs : logs.filter((entry) => entry.log_type === logType);
    return Array.from(new Set(rows.map((entry) => entry.event_type)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [logs, logType]);

  const availableSources = useMemo(() => {
    const rows = logType === "all" ? logs : logs.filter((entry) => entry.log_type === logType);
    const sources = Array.from(new Set(rows.map((entry) => entry.source))).filter(Boolean).sort((a, b) => a.localeCompare(b));
    if (source.trim() && !sources.includes(source.trim())) {
      return [source.trim(), ...sources];
    }

    return sources;
  }, [logs, logType, source]);

  const logCounters = useMemo(() => {
    const appLogs = logs.filter((entry) => entry.log_type === "app_logs").length;
    const securityEvents = logs.filter((entry) => entry.log_type === "app_user_security_events").length;

    return {
      total: logs.length,
      appLogs,
      securityEvents,
    };
  }, [logs]);

  const { onBackdropMouseDown } = useModalDismiss({
    isOpen: detailOpen,
    onClose: () => setDetailOpen(false),
    isDisabled: detailLoading,
  });

  async function loadLogs(options?: { targetPage?: number; targetPageSize?: typeof pageSize }) {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      const targetPage = options?.targetPage ?? page;
      const targetPageSize = options?.targetPageSize ?? pageSize;

      if (logType !== "all") params.set("log_type", logType);
      if (level !== "all") params.set("level", level);
      if (source.trim()) params.set("source", source.trim());
      if (eventType.trim()) params.set("event_type", eventType.trim());
      if (search.trim()) params.set("search", search.trim());
      if (correlationId.trim()) params.set("correlation_id", correlationId.trim());
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      params.set("page", String(targetPage));
      params.set("page_size", targetPageSize);

      const query = params.toString();
      const response = await fetch(`/api/admin/logs${query ? `?${query}` : ""}`);
      const payload = (await response.json()) as LogsResponse;

      if (!response.ok || !payload.success) {
        setError(payload.error?.message ?? "No se pudo cargar los logs.");
        setLogs([]);
        setTotalRows(0);
        setTotalPages(1);
        setPage(1);
        setLoading(false);
        return;
      }

      setLogs(payload.data?.logs ?? []);
      setTotalRows(payload.data?.total ?? 0);
      setTotalPages(payload.data?.total_pages ?? 1);
      setPage(payload.data?.page ?? targetPage);
      setLoading(false);
    } catch {
      setError("No se pudo cargar los logs.");
      setLogs([]);
      setTotalRows(0);
      setTotalPages(1);
      setPage(1);
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openLogDetail(logId: string, entryLogType: AppLogRow["log_type"]) {
    setDetailLoading(true);
    setSelectedLogId(logId);
    setDetailOpen(true);

    try {
      const response = await fetch(`/api/admin/logs/${logId}?log_type=${entryLogType}`);
      const payload = (await response.json()) as LogDetailResponse;

      if (!response.ok || !payload.success || !payload.data?.log) {
        setError(payload.error?.message ?? "No se pudo cargar el detalle del log.");
        setSelectedLog(null);
        setDetailLoading(false);
        return;
      }

      setSelectedLog(payload.data.log);
      setDetailLoading(false);
    } catch {
      setError("No se pudo cargar el detalle del log.");
      setSelectedLog(null);
      setDetailLoading(false);
    }
  }

  function clearFilters() {
    setLogType("all");
    setLevel("all");
    setSource("");
    setEventType("");
    setSearch("");
    setCorrelationId("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  return (
    <section className="space-y-4">
      <div className="dashboard-card-3d p-5 md:p-6">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/75">Filtros</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Acota eventos por tipo, severidad y trazabilidad para encontrar incidentes rapidamente.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-sm text-slate-700">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Tipo</span>
            <select
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary"
              value={logType}
              onChange={(event) => setLogType(event.target.value as LogTypeFilter)}
            >
              <option value="all">Todos</option>
              <option value="app_logs">Aplicacion</option>
              <option value="app_user_security_events">Seguridad</option>
            </select>
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Nivel</span>
            <select
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary"
              value={level}
              onChange={(event) => setLevel(event.target.value)}
            >
              {LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Fuente</span>
            <select
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary"
              value={source}
              onChange={(event) => setSource(event.target.value)}
            >
              <option value="">Todos</option>
              {availableSources.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Tipo evento</span>
            <select
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary"
              value={eventType}
              onChange={(event) => setEventType(event.target.value)}
            >
              <option value="">Todos</option>
              {availableEventTypes.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Correlation ID
            </span>
            <input
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-muted-foreground/70 focus:border-primary"
              value={correlationId}
              onChange={(event) => setCorrelationId(event.target.value)}
              placeholder="corr-..."
            />
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Busqueda</span>
            <input
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-muted-foreground/70 focus:border-primary"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="message, request id, error"
            />
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Fecha desde</span>
            <input
              type="date"
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Fecha hasta</span>
            <input
              type="date"
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              setPage(1);
              void loadLogs({ targetPage: 1 });
            }}
            disabled={loading}
          >
            {loading ? "Consultando..." : "Aplicar filtros"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              clearFilters();
              setTimeout(() => {
                void loadLogs({ targetPage: 1 });
              }, 0);
            }}
            disabled={loading || !canSearch}
          >
            Limpiar
          </Button>
          <Button variant="outline" onClick={() => void loadLogs()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Refrescar
          </Button>
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-700">
            Mostrando: {logs.length} / {totalRows}
          </span>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-semibold text-blue-700">
            Aplicacion: {logCounters.appLogs}
          </span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-semibold text-amber-700">
            Seguridad: {logCounters.securityEvents}
          </span>
        </div>
      </div>

      <div className="dashboard-card-3d overflow-hidden">
        <div className="border-b border-border/70 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/75">Eventos</p>
          <p className="mt-1 text-sm text-muted-foreground">Haz clic en una fila para abrir el detalle completo.</p>
        </div>

        <div className="max-h-[68vh] overflow-y-auto overflow-x-hidden rounded-[24px] border-x border-border/70 bg-white">
          <table className="w-full table-fixed divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 z-10 bg-muted/70 text-center text-xs uppercase tracking-[0.16em] text-muted-foreground backdrop-blur">
              <tr>
                <th className="w-[12%] px-4 py-3 font-medium">Fecha</th>
                <th className="w-[15%] px-4 py-3 font-medium">Tipo</th>
                <th className="w-[8%] px-4 py-3 font-medium">Nivel</th>
                <th className="w-[10%] px-4 py-3 font-medium">Fuente</th>
                <th className="w-[16%] px-4 py-3 font-medium">Tipo evento</th>
                <th className="w-[20%] px-4 py-3 font-medium">Mensaje</th>
                <th className="w-[12%] px-4 py-3 font-medium whitespace-nowrap">Correlation ID</th>
                <th className="w-[7%] px-4 py-3 font-medium">User ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-white text-center text-slate-700">
              {logs.map((row) => (
                <tr
                  key={row.id}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer text-sm transition-colors hover:bg-slate-50/80 focus-visible:bg-slate-50 focus-visible:outline-none"
                  onClick={() => {
                    void openLogDetail(row.id, row.log_type);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      void openLogDetail(row.id, row.log_type);
                    }
                  }}
                >
                  <td className="break-words px-4 py-4 align-top">{formatDate(row.created_at)}</td>
                  <td className="break-words px-4 py-4 align-top font-medium text-slate-800">
                    {getLogTypeLabel(row.log_type)}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <StatusBadge tone={levelTone(row.level)}>{row.level}</StatusBadge>
                  </td>
                  <td className="break-words px-4 py-4 align-top">{row.source}</td>
                  <td className="break-words px-4 py-4 align-top">{row.event_type}</td>
                  <td className="truncate px-4 py-4 align-top text-slate-800" title={row.message}>
                    {row.message}
                  </td>
                  <td className="truncate px-4 py-4 align-top font-mono text-xs text-slate-600" title={row.correlation_id ?? ""}>
                    {row.correlation_id ?? "-"}
                  </td>
                  <td className="truncate px-4 py-4 align-top font-mono text-xs text-slate-600" title={row.user_id ?? ""}>
                    {row.user_id ?? "-"}
                  </td>
                </tr>
              ))}

              {logs.length === 0 ? (
                <TableEmptyStateRow
                  colSpan={8}
                  title="Sin resultados"
                  description={loading ? "Consultando logs..." : "No hay logs para los filtros seleccionados."}
                  isLoading={loading}
                />
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-muted/20 px-4 py-3 text-sm">
          <div className="font-medium text-slate-600">
            Pagina {page} de {totalPages}
          </div>
          <label className="flex items-center gap-2 text-slate-700">
            <span>Filas</span>
            <select
              className="h-9 rounded-xl border border-border bg-white px-3 text-sm outline-none transition focus:border-primary"
              value={pageSize}
              onChange={(event) => {
                const nextSize = event.target.value as typeof pageSize;
                setPageSize(nextSize);
                setPage(1);
                void loadLogs({ targetPage: 1, targetPageSize: nextSize });
              }}
            >
              <option value="15">15 (default)</option>
              <option value="30">30</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="all">Todos</option>
            </select>
          </label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={loading || page <= 1 || pageSize === "all"}
              onClick={() => {
                void loadLogs({ targetPage: page - 1 });
              }}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={loading || page >= totalPages || pageSize === "all"}
              onClick={() => {
                void loadLogs({ targetPage: page + 1 });
              }}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>

      {detailOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[70] flex bg-slate-950/45 backdrop-blur-[2px]"
              onMouseDown={onBackdropMouseDown}
            >
              <aside className="ml-auto h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/70">Detalle log</p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-900">
                      {selectedLog?.event_type ?? selectedLogId ?? "Log"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {selectedLog ? formatDate(selectedLog.created_at) : "Cargando..."}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setDetailOpen(false)} disabled={detailLoading}>
                    <X className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </div>

                {detailLoading ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">
                    Cargando detalle...
                  </div>
                ) : selectedLog ? (
                  <div className="mt-6 space-y-3">
                    <DetailField label="message" value={selectedLog.message} />
                    <DetailField label="tipo" value={getLogTypeLabel(selectedLog.log_type)} />
                    <DetailField label="error_message" value={selectedLog.error_message} />
                    <DetailField label="stack_trace" value={selectedLog.stack_trace} />
                    <DetailField label="request_id" value={selectedLog.request_id} />
                    <DetailField label="correlation_id" value={selectedLog.correlation_id} />
                    <DetailField label="workflow_name" value={selectedLog.workflow_name} />
                    <DetailField label="node_name" value={selectedLog.node_name} />
                    <DetailField label="external_provider" value={selectedLog.external_provider} />
                    <DetailField label="external_request_id" value={selectedLog.external_request_id} />
                    <DetailField
                      label="http_status"
                      value={selectedLog.http_status == null ? null : String(selectedLog.http_status)}
                    />
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-950 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">metadata</p>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-xs text-slate-100">
                        {prettyJson(selectedLog.metadata)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">
                    No se encontro el detalle del log.
                  </div>
                )}
              </aside>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

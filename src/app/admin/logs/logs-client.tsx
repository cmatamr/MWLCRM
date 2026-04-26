"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { RefreshCw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useModalDismiss } from "@/components/ui/modal-dismiss";
import { TableEmptyStateRow } from "@/components/ui/state-display";
import { StatusBadge } from "@/components/ui/status-badge";

type AppLogLevel = "debug" | "info" | "warn" | "error" | "critical";

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
};

type LogsResponse = {
  success: boolean;
  data?: {
    logs: AppLogRow[];
    total: number;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          source.trim() ||
          eventType.trim() ||
          correlationId.trim() ||
          dateFrom ||
          dateTo ||
          level !== "all",
      ),
    [correlationId, dateFrom, dateTo, eventType, level, search, source],
  );

  const { onBackdropMouseDown } = useModalDismiss({
    isOpen: detailOpen,
    onClose: () => setDetailOpen(false),
    isDisabled: detailLoading,
  });

  async function loadLogs() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (level !== "all") params.set("level", level);
      if (source.trim()) params.set("source", source.trim());
      if (eventType.trim()) params.set("event_type", eventType.trim());
      if (search.trim()) params.set("search", search.trim());
      if (correlationId.trim()) params.set("correlation_id", correlationId.trim());
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const query = params.toString();
      const response = await fetch(`/api/admin/logs${query ? `?${query}` : ""}`);
      const payload = (await response.json()) as LogsResponse;

      if (!response.ok || !payload.success) {
        setError(payload.error?.message ?? "No se pudo cargar los logs.");
        setLogs([]);
        setLoading(false);
        return;
      }

      setLogs(payload.data?.logs ?? []);
      setLoading(false);
    } catch {
      setError("No se pudo cargar los logs.");
      setLogs([]);
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openLogDetail(logId: string) {
    setDetailLoading(true);
    setSelectedLogId(logId);
    setDetailOpen(true);

    try {
      const response = await fetch(`/api/admin/logs/${logId}`);
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
    setLevel("all");
    setSource("");
    setEventType("");
    setSearch("");
    setCorrelationId("");
    setDateFrom("");
    setDateTo("");
  }

  return (
    <section className="space-y-4">
      <div className="dashboard-card-3d p-5 md:p-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-sm text-slate-700">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Nivel</span>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
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
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              value={source}
              onChange={(event) => setSource(event.target.value)}
              placeholder="api.admin"
            />
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Tipo evento</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              value={eventType}
              onChange={(event) => setEventType(event.target.value)}
              placeholder="admin_api_error"
            />
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Correlation ID
            </span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              value={correlationId}
              onChange={(event) => setCorrelationId(event.target.value)}
              placeholder="corr-..."
            />
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Busqueda</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="message, request id, error"
            />
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Fecha desde</span>
            <input
              type="date"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Fecha hasta</span>
            <input
              type="date"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={() => void loadLogs()} disabled={loading}>
            {loading ? "Consultando..." : "Aplicar filtros"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              clearFilters();
              setTimeout(() => {
                void loadLogs();
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
      </div>

      <div className="dashboard-card-3d overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100/80 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Nivel</th>
                <th className="px-4 py-3">Fuente</th>
                <th className="px-4 py-3">Tipo evento</th>
                <th className="px-4 py-3">Mensaje</th>
                <th className="px-4 py-3">Correlation ID</th>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3 text-right">Accion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {logs.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 align-top">{formatDate(row.created_at)}</td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge tone={levelTone(row.level)}>{row.level}</StatusBadge>
                  </td>
                  <td className="px-4 py-3 align-top">{row.source}</td>
                  <td className="px-4 py-3 align-top">{row.event_type}</td>
                  <td className="max-w-[320px] truncate px-4 py-3 align-top" title={row.message}>
                    {row.message}
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 align-top" title={row.correlation_id ?? ""}>
                    {row.correlation_id ?? "-"}
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 align-top" title={row.user_id ?? ""}>
                    {row.user_id ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-right align-top">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void openLogDetail(row.id);
                      }}
                    >
                      Ver
                    </Button>
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

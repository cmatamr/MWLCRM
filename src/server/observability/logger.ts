import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";

import { sanitizeLogMetadata, scrubSensitiveString } from "@/server/observability/sanitize-log";

const LOG_LEVELS = ["debug", "info", "warn", "error", "critical"] as const;

type AppLogLevel = (typeof LOG_LEVELS)[number];

type AppLogInput = {
  level?: AppLogLevel;
  source?: string | null;
  eventType?: string | null;
  message?: string | null;
  correlationId?: string | null;
  requestId?: string | null;
  userId?: string | null;
  leadId?: string | null;
  threadId?: string | null;
  workflowName?: string | null;
  nodeName?: string | null;
  externalProvider?: string | null;
  externalRequestId?: string | null;
  httpStatus?: number | null;
  errorMessage?: string | null;
  stackTrace?: string | null;
  metadata?: unknown;
};

type AppLogInputWithLevel = Omit<AppLogInput, "level">;

function normalizeLevel(level: unknown): AppLogLevel {
  if (typeof level === "string" && (LOG_LEVELS as readonly string[]).includes(level)) {
    return level as AppLogLevel;
  }

  return "info";
}

function normalizeText(value: unknown, fallback: string | null = null): string | null {
  if (value == null) {
    return fallback;
  }

  const normalized = scrubSensitiveString(String(value)).trim();
  if (!normalized) {
    return fallback;
  }

  return normalized;
}

function normalizeUuid(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeHttpStatus(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const normalized = Math.trunc(value);
  if (normalized < 100 || normalized > 599) {
    return null;
  }

  return normalized;
}

function buildSanitizedPayload(input: AppLogInput) {
  const level = normalizeLevel(input.level);
  const source = normalizeText(input.source, "app") ?? "app";
  const eventType = normalizeText(input.eventType, "application_event") ?? "application_event";
  const message = normalizeText(input.message, "Application log event") ?? "Application log event";

  return {
    level,
    source,
    event_type: eventType,
    message,
    correlation_id: normalizeText(input.correlationId),
    request_id: normalizeText(input.requestId),
    user_id: normalizeUuid(input.userId),
    lead_id: normalizeUuid(input.leadId),
    thread_id: normalizeUuid(input.threadId),
    workflow_name: normalizeText(input.workflowName),
    node_name: normalizeText(input.nodeName),
    external_provider: normalizeText(input.externalProvider),
    external_request_id: normalizeText(input.externalRequestId),
    http_status: normalizeHttpStatus(input.httpStatus),
    error_message: normalizeText(input.errorMessage),
    stack_trace: normalizeText(input.stackTrace),
    metadata: sanitizeLogMetadata(input.metadata),
  };
}

export async function createAppLog(input: AppLogInput): Promise<void> {
  const service = createSupabaseServiceClient();

  let payload: ReturnType<typeof buildSanitizedPayload>;

  try {
    payload = buildSanitizedPayload(input);
  } catch {
    payload = {
      level: normalizeLevel(input.level),
      source: normalizeText(input.source, "app") ?? "app",
      event_type: "logger_sanitization_failed",
      message: normalizeText(input.message, "Application log event") ?? "Application log event",
      correlation_id: null,
      request_id: null,
      user_id: null,
      lead_id: null,
      thread_id: null,
      workflow_name: null,
      node_name: null,
      external_provider: null,
      external_request_id: null,
      http_status: null,
      error_message: null,
      stack_trace: null,
      metadata: {},
    };
  }

  try {
    const { error } = await service.from("app_logs").insert(payload);

    if (error) {
      console.error("createAppLog insert failed", {
        level: payload.level,
        source: payload.source,
        eventType: payload.event_type,
        message: payload.message,
        reason: error.message,
      });
    }
  } catch (error) {
    console.error("createAppLog request failed", {
      level: payload.level,
      source: payload.source,
      eventType: payload.event_type,
      message: payload.message,
      reason: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function logInfo(input: AppLogInputWithLevel): Promise<void> {
  await createAppLog({ ...input, level: "info" });
}

export async function logWarn(input: AppLogInputWithLevel): Promise<void> {
  await createAppLog({ ...input, level: "warn" });
}

export async function logError(input: AppLogInputWithLevel): Promise<void> {
  await createAppLog({ ...input, level: "error" });
}

export async function logCritical(input: AppLogInputWithLevel): Promise<void> {
  await createAppLog({ ...input, level: "critical" });
}

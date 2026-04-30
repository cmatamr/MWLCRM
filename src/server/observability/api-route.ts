import "server-only";

import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { ApiRouteError } from "@/server/api/http";
import { classifyApiErrorEvent } from "@/server/observability/error-taxonomy";
import { logCritical, logError } from "@/server/observability/logger";

type LogApiRouteErrorInput = {
  request: Request;
  route: string;
  source: string;
  defaultEventType: string;
  error: unknown;
  message?: string;
  httpStatus?: number | null;
  userId?: string | null;
  leadId?: string | null;
  threadId?: string | null;
  metadata?: Record<string, unknown>;
  externalProvider?: string | null;
  externalRequestId?: string | null;
};

type PrismaErrorLike = {
  code?: unknown;
  clientVersion?: unknown;
};

type UnknownRecord = Record<string, unknown>;
const REQUEST_ID_HEADERS = ["x-request-id", "x-correlation-id", "cf-ray"] as const;
const LEGACY_EVENT_TYPE_MAP: Record<string, string> = {
  commercial_api_error: "leads_api_error",
  security_api_error: "api_unhandled_error",
  internal_api_error: "api_unhandled_error",
};

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as UnknownRecord;
}

function resolveErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return "API route error";
}

function resolveErrorName(error: unknown): string {
  if (error instanceof Error && error.name.trim()) {
    return error.name.trim();
  }

  const record = asRecord(error);
  if (typeof record?.name === "string" && record.name.trim()) {
    return record.name.trim();
  }

  return "UnknownError";
}

function resolveErrorCode(error: unknown): string | null {
  if (error instanceof ApiRouteError) {
    return error.code;
  }

  const record = asRecord(error);
  if (typeof record?.code === "string" && record.code.trim()) {
    return record.code.trim();
  }

  return null;
}

function resolveStackTrace(error: unknown): string | null {
  if (error instanceof Error && error.stack) {
    return error.stack;
  }

  return null;
}

function resolveHttpStatus(error: unknown, responseStatus?: number | null): number | null {
  if (typeof responseStatus === "number" && Number.isFinite(responseStatus)) {
    return responseStatus;
  }

  if (error instanceof ApiRouteError) {
    return error.status;
  }

  const errorWithStatus = asRecord(error);
  const status = errorWithStatus?.status;

  if (typeof status === "number" && Number.isFinite(status)) {
    return Math.trunc(status);
  }

  return null;
}

function resolvePrismaCode(error: unknown): string | null {
  const prismaError = asRecord(error) as PrismaErrorLike | null;

  if (typeof prismaError?.code === "string" && /^P\d{4}$/i.test(prismaError.code.trim())) {
    return prismaError.code.trim().toUpperCase();
  }

  return null;
}

function resolvePrismaClientVersion(error: unknown): string | null {
  const prismaError = asRecord(error) as PrismaErrorLike | null;

  if (
    typeof prismaError?.clientVersion === "string" &&
    prismaError.clientVersion.trim()
  ) {
    return prismaError.clientVersion.trim();
  }

  return null;
}

function resolveSupabaseCode(error: unknown): string | null {
  const record = asRecord(error);
  const code = record?.code;

  if (typeof code === "string" && /^(PGRST|22|23|28|42)/i.test(code.trim())) {
    return code.trim();
  }

  return null;
}

function resolveRequestId(request: Request): string {
  for (const headerName of REQUEST_ID_HEADERS) {
    const value = request.headers.get(headerName)?.trim();
    if (value) {
      return value;
    }
  }

  return randomUUID();
}

function resolveCorrelationId(request: Request, requestId: string): string {
  const correlationId = request.headers.get("x-correlation-id")?.trim();
  return correlationId || requestId;
}

function resolveEnvironment(): string {
  return process.env.VERCEL_ENV?.trim() || process.env.NODE_ENV?.trim() || "unknown";
}

function looksLikeSupabaseError(error: unknown): boolean {
  const record = asRecord(error);
  const code = record?.code;

  if (typeof code === "string") {
    return code.startsWith("PGRST") || code.startsWith("22") || code.startsWith("23");
  }

  const name = record?.name;

  if (typeof name === "string" && /postgrest|supabase/i.test(name)) {
    return true;
  }

  const message = resolveErrorMessage(error);
  return /supabase|postgrest/i.test(message);
}

function looksLikeSupabaseStorageError(error: unknown): boolean {
  const message = resolveErrorMessage(error);
  return /supabase.*storage|storage bucket|signed url|object storage|storage/i.test(message);
}

function looksLikeSupabaseAuthError(error: unknown): boolean {
  const message = resolveErrorMessage(error);
  return /supabase.*auth|auth\.admin|jwt|session|unauthorized|invalid api key/i.test(message);
}

function looksLikeExternalProviderError(error: unknown, input: LogApiRouteErrorInput): boolean {
  if (resolveExternalProvider(error, input)) {
    return true;
  }

  const record = asRecord(error);
  const name = record?.name;

  if (typeof name === "string" && /metaapierror|external/i.test(name)) {
    return true;
  }

  const message = resolveErrorMessage(error);
  return /meta api|external provider|upstream/i.test(message);
}

function mapExternalProviderEventType(provider: string | null): string {
  if (!provider) {
    return "external_provider_error";
  }

  const normalized = provider.toLowerCase();

  if (normalized.includes("ycloud")) {
    return "ycloud_api_error";
  }

  if (normalized.includes("whatsapp")) {
    return "whatsapp_api_error";
  }

  if (normalized.includes("nova")) {
    return "nova_api_error";
  }

  if (normalized.includes("n8n")) {
    return "n8n_webhook_error";
  }

  return "external_provider_error";
}

function isValidationError(error: unknown, httpStatus: number | null): boolean {
  if (error instanceof ZodError) {
    return true;
  }

  if (error instanceof ApiRouteError) {
    return error.status === 400 || error.code === "BAD_REQUEST";
  }

  return httpStatus === 400;
}

function buildSearchParamKeys(request: Request): string[] {
  const params = new URL(request.url).searchParams;
  return Array.from(new Set(params.keys())).slice(0, 30);
}

function deriveEntityMetadata(request: Request): Record<string, string> {
  const pathname = new URL(request.url).pathname;
  const segments = pathname.split("/").filter(Boolean);

  const output: Record<string, string> = {};

  const ordersIndex = segments.indexOf("orders");
  if (ordersIndex >= 0 && segments.length > ordersIndex + 1) {
    const orderId = segments[ordersIndex + 1];
    if (orderId) {
      output.order_id = orderId;
      output.orderId = orderId;
    }
  }

  const conversationsIndex = segments.indexOf("conversations");
  if (conversationsIndex >= 0 && segments.length > conversationsIndex + 1) {
    const threadId = segments[conversationsIndex + 1];
    if (threadId) {
      output.thread_id = threadId;
      output.threadId = threadId;
    }
  }

  const customersIndex = segments.indexOf("customers");
  if (customersIndex >= 0 && segments.length > customersIndex + 1) {
    const customerId = segments[customersIndex + 1];
    if (customerId) {
      output.customer_id = customerId;
      output.customerId = customerId;
    }
  }

  return output;
}

function resolveExternalProvider(error: unknown, input: LogApiRouteErrorInput): string | null {
  if (input.externalProvider) {
    return input.externalProvider;
  }

  const record = asRecord(error);
  const name = record?.name;

  if (name === "MetaApiError") {
    return "meta";
  }

  const message = resolveErrorMessage(error).toLowerCase();
  if (message.includes("ycloud")) {
    return "ycloud";
  }
  if (message.includes("whatsapp")) {
    return "whatsapp";
  }
  if (message.includes("nova")) {
    return "nova";
  }
  if (message.includes("n8n")) {
    return "n8n";
  }

  return null;
}

function resolveExternalRequestId(error: unknown, input: LogApiRouteErrorInput): string | null {
  if (input.externalRequestId) {
    return input.externalRequestId;
  }

  const record = asRecord(error);
  const requestId = record?.requestId;

  if (typeof requestId === "string" && requestId.trim()) {
    return requestId.trim();
  }

  const payload = asRecord(record?.payload);
  const payloadError = asRecord(payload?.error);
  const fbtraceId = payloadError?.fbtrace_id;

  if (typeof fbtraceId === "string" && fbtraceId.trim()) {
    return fbtraceId.trim();
  }

  return null;
}

function classifyEventType(input: LogApiRouteErrorInput): {
  eventType: string;
  message: string;
  errorStage: string;
  prismaCode: string | null;
  prismaClientVersion: string | null;
  supabaseCode: string | null;
} {
  return classifyApiErrorEvent({
    error: input.error,
    route: input.route,
    defaultEventType: input.defaultEventType,
    httpStatus: resolveHttpStatus(input.error, input.httpStatus),
    message: input.message,
    externalProvider: input.externalProvider,
  });
}

function shouldLogCritical(eventType: string, httpStatus: number | null): boolean {
  if (eventType === "prisma_connection_pool_timeout") {
    return false;
  }

  if (httpStatus == null) {
    return false;
  }

  return httpStatus >= 500 && (eventType === "external_provider_error" || eventType === "supabase_query_error");
}

function deriveProviderHintFromPreview(preview: string): string | null {
  const normalized = preview.toLowerCase();

  if (normalized.includes("missing scopes: api.usage.read")) {
    return "Missing OpenAI scope api.usage.read.";
  }
  if (normalized.includes("insufficient permissions")) {
    return "Insufficient permissions in external provider.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many requests")) {
    return "External provider rate limit reached.";
  }
  if (normalized.includes("invalid api key") || normalized.includes("incorrect api key")) {
    return "Invalid or unauthorized API key.";
  }

  return null;
}

function deriveApiRouteErrorDetailsMetadata(error: unknown): Record<string, unknown> {
  if (!(error instanceof ApiRouteError)) {
    return {};
  }

  const details = asRecord(error.details);
  if (!details) {
    return {};
  }

  const providerStatus =
    typeof details.providerStatus === "number" && Number.isFinite(details.providerStatus)
      ? Math.trunc(details.providerStatus)
      : null;

  const providerErrorCode =
    typeof details.providerErrorCode === "string" && details.providerErrorCode.trim()
      ? details.providerErrorCode.trim()
      : null;

  const providerResponsePreview =
    typeof details.responseBodyPreview === "string" && details.responseBodyPreview.trim()
      ? details.responseBodyPreview.trim()
      : null;

  const providerHintFromDetails =
    typeof details.hint === "string" && details.hint.trim() ? details.hint.trim() : null;
  const providerHintFromPreview =
    providerResponsePreview ? deriveProviderHintFromPreview(providerResponsePreview) : null;

  const metadata: Record<string, unknown> = {
    providerStatus,
    providerErrorCode,
    providerResponsePreview,
    providerHint: providerHintFromDetails ?? providerHintFromPreview,
  };

  return metadata;
}

export async function logApiRouteError(input: LogApiRouteErrorInput): Promise<void> {
  const httpStatus = resolveHttpStatus(input.error, input.httpStatus);
  const requestId = resolveRequestId(input.request);
  const correlationId = resolveCorrelationId(input.request, requestId);
  const { eventType, message, errorStage, prismaCode, prismaClientVersion, supabaseCode } =
    classifyEventType(input);
  const externalProvider = resolveExternalProvider(input.error, input);
  const externalRequestId = resolveExternalRequestId(input.error, input);

  const payload = {
    source: input.source,
    eventType,
    message,
    httpStatus,
    userId: input.userId ?? null,
    leadId: input.leadId ?? null,
    threadId: input.threadId ?? null,
    correlationId,
    requestId,
    externalProvider,
    externalRequestId,
    errorMessage: resolveErrorMessage(input.error),
    stackTrace: resolveStackTrace(input.error),
    metadata: {
      route: input.route,
      method: input.request.method,
      requestId,
      environment: resolveEnvironment(),
      searchParamKeys: buildSearchParamKeys(input.request),
      errorName: resolveErrorName(input.error),
      errorCode: resolveErrorCode(input.error),
      httpStatus,
      errorStage,
      prismaCode,
      prismaClientVersion,
      supabaseCode,
      externalProvider,
      externalRequestId,
      ...deriveApiRouteErrorDetailsMetadata(input.error),
      ...deriveEntityMetadata(input.request),
      ...input.metadata,
    },
  };

  try {
    if (shouldLogCritical(eventType, httpStatus)) {
      await logCritical(payload);
      return;
    }

    await logError(payload);
  } catch {
    // Keep API response flow intact when logger fails.
  }
}

export function buildSyntheticApiRequest(route: string, method: string): Request {
  return new Request(`http://localhost${route}`, { method });
}

export function classifyApiRouteErrorForTest(input: {
  route: string;
  defaultEventType: string;
  error: unknown;
  httpStatus?: number | null;
  source?: string;
}): {
  eventType: string;
  message: string;
  errorStage: string;
  prismaCode: string | null;
  prismaClientVersion: string | null;
  supabaseCode: string | null;
} {
  const synthetic = buildSyntheticApiRequest(input.route, "GET");
  return classifyEventType({
    request: synthetic,
    route: input.route,
    source: input.source ?? "api.test",
    defaultEventType: input.defaultEventType,
    error: input.error,
    httpStatus: input.httpStatus,
  });
}

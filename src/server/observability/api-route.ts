import "server-only";

import { ApiRouteError } from "@/server/api/http";
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

  if (typeof prismaError?.code === "string" && prismaError.code.trim()) {
    return prismaError.code.trim();
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

function buildSearchParams(request: Request): Record<string, string> {
  const params = new URL(request.url).searchParams;
  return Object.fromEntries(params.entries());
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
    }
  }

  const conversationsIndex = segments.indexOf("conversations");
  if (conversationsIndex >= 0 && segments.length > conversationsIndex + 1) {
    const threadId = segments[conversationsIndex + 1];
    if (threadId) {
      output.thread_id = threadId;
    }
  }

  const customersIndex = segments.indexOf("customers");
  if (customersIndex >= 0 && segments.length > customersIndex + 1) {
    const customerId = segments[customersIndex + 1];
    if (customerId) {
      output.customer_id = customerId;
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
  prismaCode: string | null;
  prismaClientVersion: string | null;
} {
  const prismaCode = resolvePrismaCode(input.error);
  const prismaClientVersion = resolvePrismaClientVersion(input.error);

  if (prismaCode === "P2024") {
    return {
      eventType: "prisma_connection_pool_timeout",
      message: "Connection pool timeout in API route",
      prismaCode,
      prismaClientVersion,
    };
  }

  if (prismaCode) {
    return {
      eventType: "prisma_query_error",
      message: input.message ?? `API route error in ${input.route}`,
      prismaCode,
      prismaClientVersion,
    };
  }

  if (looksLikeSupabaseError(input.error)) {
    return {
      eventType: "supabase_query_error",
      message: input.message ?? `API route error in ${input.route}`,
      prismaCode,
      prismaClientVersion,
    };
  }

  if (looksLikeExternalProviderError(input.error, input)) {
    return {
      eventType: "external_provider_error",
      message: input.message ?? `API route error in ${input.route}`,
      prismaCode,
      prismaClientVersion,
    };
  }

  return {
    eventType: input.defaultEventType,
    message: input.message ?? `API route error in ${input.route}`,
    prismaCode,
    prismaClientVersion,
  };
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

export async function logApiRouteError(input: LogApiRouteErrorInput): Promise<void> {
  const httpStatus = resolveHttpStatus(input.error, input.httpStatus);
  const { eventType, message, prismaCode, prismaClientVersion } = classifyEventType(input);
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
    externalProvider,
    externalRequestId,
    errorMessage: resolveErrorMessage(input.error),
    stackTrace: resolveStackTrace(input.error),
    metadata: {
      route: input.route,
      method: input.request.method,
      searchParams: buildSearchParams(input.request),
      prismaCode,
      prismaClientVersion,
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

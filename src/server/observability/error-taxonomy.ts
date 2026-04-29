import { ZodError } from "zod";

type UnknownRecord = Record<string, unknown>;

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

function isApiRouteErrorLike(error: unknown): error is {
  status: number;
  code: string;
} {
  const record = asRecord(error);
  return (
    Boolean(record) &&
    typeof record?.status === "number" &&
    typeof record?.code === "string"
  );
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

function resolvePrismaCode(error: unknown): string | null {
  const prismaError = asRecord(error);

  if (typeof prismaError?.code === "string" && /^P\d{4}$/i.test(prismaError.code.trim())) {
    return prismaError.code.trim().toUpperCase();
  }

  return null;
}

function resolvePrismaClientVersion(error: unknown): string | null {
  const prismaError = asRecord(error);

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

function resolveExternalProvider(error: unknown, externalProvider?: string | null): string | null {
  if (externalProvider) {
    return externalProvider;
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
  if (message.includes("meta")) {
    return "meta";
  }

  return null;
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

function looksLikeExternalProviderError(error: unknown, externalProvider?: string | null): boolean {
  if (resolveExternalProvider(error, externalProvider)) {
    return true;
  }

  const record = asRecord(error);
  const name = record?.name;

  if (typeof name === "string" && /metaapierror|external/i.test(name)) {
    return true;
  }

  const message = resolveErrorMessage(error);
  return /meta api|external provider|upstream|ycloud|whatsapp|nova|n8n/i.test(message);
}

function isValidationError(error: unknown, httpStatus: number | null): boolean {
  if (error instanceof ZodError) {
    return true;
  }

  if (isApiRouteErrorLike(error)) {
    return error.status === 400 || error.code === "BAD_REQUEST";
  }

  return httpStatus === 400;
}

export function classifyApiErrorEvent(input: {
  error: unknown;
  route: string;
  defaultEventType: string;
  httpStatus?: number | null;
  message?: string;
  externalProvider?: string | null;
}): {
  eventType: string;
  message: string;
  errorStage: string;
  prismaCode: string | null;
  prismaClientVersion: string | null;
  supabaseCode: string | null;
  externalProvider: string | null;
} {
  const prismaCode = resolvePrismaCode(input.error);
  const prismaClientVersion = resolvePrismaClientVersion(input.error);
  const supabaseCode = resolveSupabaseCode(input.error);
  const httpStatus = typeof input.httpStatus === "number" ? input.httpStatus : null;

  if (prismaCode === "P2024") {
    return {
      eventType: "prisma_connection_pool_timeout",
      message: "Prisma connection pool timeout while executing the request.",
      errorStage: "database_connection_pool",
      prismaCode,
      prismaClientVersion,
      supabaseCode,
      externalProvider: null,
    };
  }

  if (prismaCode === "P2034" || /transaction/i.test(resolveErrorMessage(input.error))) {
    return {
      eventType: "prisma_transaction_error",
      message: input.message ?? `Prisma transaction failed in ${input.route}.`,
      errorStage: "database_transaction",
      prismaCode,
      prismaClientVersion,
      supabaseCode,
      externalProvider: null,
    };
  }

  if (prismaCode) {
    return {
      eventType: "prisma_query_error",
      message: input.message ?? `Prisma query failed in ${input.route}.`,
      errorStage: "database_query",
      prismaCode,
      prismaClientVersion,
      supabaseCode,
      externalProvider: null,
    };
  }

  if (isApiRouteErrorLike(input.error) && [401, 403].includes(input.error.status)) {
    return {
      eventType: LEGACY_EVENT_TYPE_MAP[input.defaultEventType] ?? input.defaultEventType,
      message: input.message ?? resolveErrorMessage(input.error),
      errorStage: "authorization",
      prismaCode,
      prismaClientVersion,
      supabaseCode,
      externalProvider: null,
    };
  }

  const errorCode = isApiRouteErrorLike(input.error) ? input.error.code : null;
  if (errorCode === "TURNSTILE_INVALID" || errorCode === "TURNSTILE_EXPIRED") {
    return {
      eventType: "turnstile_verification_failed",
      message: input.message ?? "Turnstile verification failed.",
      errorStage: "turnstile_verification",
      prismaCode,
      prismaClientVersion,
      supabaseCode,
      externalProvider: null,
    };
  }

  if (errorCode === "TURNSTILE_UNAVAILABLE" || errorCode === "TURNSTILE_MISCONFIGURED") {
    return {
      eventType:
        errorCode === "TURNSTILE_MISCONFIGURED"
          ? "auth_login_config_error"
          : "turnstile_verification_error",
      message:
        input.message ??
        (errorCode === "TURNSTILE_MISCONFIGURED"
          ? "Turnstile configuration error."
          : "Turnstile verification service unavailable."),
      errorStage: "turnstile_verification",
      prismaCode,
      prismaClientVersion,
      supabaseCode,
      externalProvider: null,
    };
  }

  if (isValidationError(input.error, httpStatus)) {
    return {
      eventType: "validation_error",
      message: input.message ?? `Validation error in ${input.route}.`,
      errorStage: "validation",
      prismaCode,
      prismaClientVersion,
      supabaseCode,
      externalProvider: null,
    };
  }

  if (looksLikeSupabaseStorageError(input.error)) {
    return {
      eventType: "supabase_storage_error",
      message: input.message ?? `Supabase storage operation failed in ${input.route}.`,
      errorStage: "supabase_storage",
      prismaCode,
      prismaClientVersion,
      supabaseCode,
      externalProvider: null,
    };
  }

  if (looksLikeSupabaseAuthError(input.error)) {
    return {
      eventType: "supabase_auth_error",
      message: input.message ?? `Supabase auth operation failed in ${input.route}.`,
      errorStage: "supabase_auth",
      prismaCode,
      prismaClientVersion,
      supabaseCode,
      externalProvider: null,
    };
  }

  if (looksLikeSupabaseError(input.error)) {
    return {
      eventType: "supabase_query_error",
      message: input.message ?? `Supabase query failed in ${input.route}.`,
      errorStage: "supabase_query",
      prismaCode,
      prismaClientVersion,
      supabaseCode,
      externalProvider: null,
    };
  }

  if (looksLikeExternalProviderError(input.error, input.externalProvider)) {
    const provider = resolveExternalProvider(input.error, input.externalProvider);
    return {
      eventType: mapExternalProviderEventType(provider),
      message: input.message ?? `External provider request failed in ${input.route}.`,
      errorStage: "external_http_request",
      prismaCode,
      prismaClientVersion,
      supabaseCode,
      externalProvider: provider,
    };
  }

  const mappedDefault = LEGACY_EVENT_TYPE_MAP[input.defaultEventType] ?? input.defaultEventType;
  const eventType =
    mappedDefault && mappedDefault.trim().length > 0
      ? mappedDefault
      : httpStatus != null && httpStatus >= 500
        ? "api_unhandled_error"
        : "config_error";

  return {
    eventType,
    message:
      input.message ??
      (httpStatus != null && httpStatus >= 500
        ? `Unhandled server error in ${input.route}.`
        : `Unhandled route error in ${input.route}.`),
    errorStage: httpStatus != null && httpStatus >= 500 ? "unhandled_exception" : "request_handling",
    prismaCode,
    prismaClientVersion,
    supabaseCode,
    externalProvider: null,
  };
}

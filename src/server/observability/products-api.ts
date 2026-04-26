import "server-only";

import { ApiRouteError } from "@/server/api/http";
import { logError } from "@/server/observability/logger";

type LogProductsApiErrorInput = {
  request: Request;
  route: string;
  error: unknown;
  httpStatus?: number | null;
};

type PrismaErrorLike = {
  code?: unknown;
  clientVersion?: unknown;
};

function resolveErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return "Products API error";
}

function resolveStack(error: unknown): string | null {
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

  return null;
}

function getPrismaErrorLike(error: unknown): PrismaErrorLike | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  return error as PrismaErrorLike;
}

function resolvePrismaCode(error: unknown): string | null {
  const prismaError = getPrismaErrorLike(error);

  if (typeof prismaError?.code === "string" && prismaError.code.trim()) {
    return prismaError.code.trim();
  }

  return null;
}

function resolvePrismaClientVersion(error: unknown): string | null {
  const prismaError = getPrismaErrorLike(error);

  if (
    typeof prismaError?.clientVersion === "string" &&
    prismaError.clientVersion.trim()
  ) {
    return prismaError.clientVersion.trim();
  }

  return null;
}

function serializeSearchParams(request: Request): Record<string, string> {
  const searchParams = new URL(request.url).searchParams;
  return Object.fromEntries(searchParams.entries());
}

export async function logProductsApiError(input: LogProductsApiErrorInput): Promise<void> {
  const prismaCode = resolvePrismaCode(input.error);
  const prismaClientVersion = resolvePrismaClientVersion(input.error);
  const isPrismaPoolTimeout = prismaCode === "P2024";
  const isPrismaQueryError = Boolean(prismaCode && !isPrismaPoolTimeout);

  const eventType = isPrismaPoolTimeout
    ? "prisma_connection_pool_timeout"
    : isPrismaQueryError
      ? "prisma_query_error"
      : "products_api_error";

  const message = isPrismaPoolTimeout
    ? "Connection pool timeout in API route"
    : isPrismaQueryError
      ? "Prisma query error in products API"
      : `Products API error in ${input.route}`;

  try {
    await logError({
      source: "api.products",
      eventType,
      message,
      httpStatus: resolveHttpStatus(input.error, input.httpStatus),
      errorMessage: resolveErrorMessage(input.error),
      stackTrace: resolveStack(input.error),
      metadata: {
        route: input.route,
        method: input.request.method,
        searchParams: serializeSearchParams(input.request),
        prismaCode,
        prismaClientVersion,
      },
    });
  } catch {
    // Do not interrupt API responses if observability fails.
  }
}

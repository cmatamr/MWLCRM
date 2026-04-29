import { NextResponse } from "next/server";
import { ZodError } from "zod";

import "@/lib/security/install-log-redaction";
import { redactSensitiveData } from "@/lib/security/redaction";
import type { ApiErrorBody, ApiErrorResponse, ApiSuccessResponse } from "@/types/api";
import { isUuid } from "@/server/services/shared";
import { logError } from "@/server/observability/logger";

export type RouteContext<TParams extends Record<string, string>> = {
  params: Promise<TParams>;
};

export class ApiRouteError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(input: {
    status: number;
    code: string;
    message: string;
    details?: unknown;
  }) {
    super(input.message);
    this.name = "ApiRouteError";
    this.status = input.status;
    this.code = input.code;
    this.details = input.details;
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiSuccessResponse<T>>(
    {
      success: true,
      data,
    },
    init,
  );
}

export function fail(error: ApiErrorBody, init?: ResponseInit) {
  return NextResponse.json<ApiErrorResponse>(
    {
      success: false,
      error,
    },
    init,
  );
}

export function badRequest(message: string, details?: unknown) {
  return new ApiRouteError({
    status: 400,
    code: "BAD_REQUEST",
    message,
    details,
  });
}

export function unauthorized(message: string, details?: unknown) {
  return new ApiRouteError({
    status: 401,
    code: "UNAUTHORIZED",
    message,
    details,
  });
}

export function forbidden(message: string, details?: unknown) {
  return new ApiRouteError({
    status: 403,
    code: "FORBIDDEN",
    message,
    details,
  });
}

export function notFound(message: string, details?: unknown) {
  return new ApiRouteError({
    status: 404,
    code: "NOT_FOUND",
    message,
    details,
  });
}

export function conflict(message: string, details?: unknown) {
  return new ApiRouteError({
    status: 409,
    code: "CONFLICT",
    message,
    details,
  });
}

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return fail(
      {
        code: "BAD_REQUEST",
        message: "Invalid request parameters.",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        })),
      },
      { status: 400 },
    );
  }

  if (error instanceof ApiRouteError) {
    return fail(
      {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      { status: error.status },
    );
  }

  void logError({
    source: "api.unhandled",
    eventType: "api_unhandled_error",
    message: "Unhandled API route error",
    httpStatus: 500,
    errorMessage: error instanceof Error ? error.message : "unknown",
    stackTrace: error instanceof Error ? error.stack : null,
    metadata: {
      error: redactSensitiveData(error),
      environment: process.env.VERCEL_ENV?.trim() || process.env.NODE_ENV?.trim() || "unknown",
    },
  });

  return fail(
    {
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected server error.",
    },
    { status: 500 },
  );
}

export function parsePositiveIntParam(
  searchParams: URLSearchParams,
  key: string,
): number | undefined {
  const value = searchParams.get(key);

  if (value == null || value.trim() === "") {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw badRequest(`Query param "${key}" must be a positive integer.`, {
      key,
      value,
    });
  }

  return parsed;
}

export function parseStringParam(
  searchParams: URLSearchParams,
  key: string,
): string | undefined {
  const value = searchParams.get(key)?.trim();
  return value ? value : undefined;
}

export function parseEnumParam<TEnum extends Record<string, string>>(
  searchParams: URLSearchParams,
  key: string,
  enumObject: TEnum,
): TEnum[keyof TEnum] | undefined {
  const value = parseStringParam(searchParams, key);

  if (!value) {
    return undefined;
  }

  if (!Object.values(enumObject).includes(value)) {
    throw badRequest(`Query param "${key}" has an invalid value.`, {
      key,
      value,
      allowedValues: Object.values(enumObject),
    });
  }

  return value as TEnum[keyof TEnum];
}

export function parseLiteralParam<const TValues extends readonly string[]>(
  searchParams: URLSearchParams,
  key: string,
  allowedValues: TValues,
): TValues[number] | undefined {
  const value = parseStringParam(searchParams, key);

  if (!value) {
    return undefined;
  }

  if (!allowedValues.includes(value)) {
    throw badRequest(`Query param "${key}" has an invalid value.`, {
      key,
      value,
      allowedValues,
    });
  }

  return value as TValues[number];
}

export async function parseUuidRouteParam(
  context: RouteContext<{ id: string }>,
  key = "id",
): Promise<string> {
  const params = await context.params;
  const value = params.id;

  if (!value || !isUuid(value)) {
    throw badRequest(`Route param "${key}" must be a valid UUID.`, {
      key,
      value,
    });
  }

  return value;
}

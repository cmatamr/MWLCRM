import type { ApiErrorBody, ApiResponse } from "@/types/api";

export type QueryPrimitive = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryPrimitive>;

export class FetcherError extends Error {
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
    this.name = "FetcherError";
    this.status = input.status;
    this.code = input.code;
    this.details = input.details;
  }
}

export function buildApiUrl(path: string, query?: QueryParams, baseUrl = "") {
  const url = new URL(path, baseUrl || "http://localhost");

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value == null || value === "") {
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  if (!baseUrl) {
    return `${url.pathname}${url.search}`;
  }

  return url.toString();
}

async function parseApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  try {
    return (await response.json()) as ApiResponse<T>;
  } catch {
    throw new FetcherError({
      status: response.status,
      code: "INVALID_JSON_RESPONSE",
      message: "The API returned an invalid JSON response.",
    });
  }
}

function toFetcherError(status: number, error: ApiErrorBody) {
  return new FetcherError({
    status,
    code: error.code,
    message: error.message,
    details: error.details,
  });
}

export async function fetcher<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    method: "GET",
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
    cache: init?.cache ?? "no-store",
  });

  const payload = await parseApiResponse<T>(response);

  if (!response.ok || !payload.success) {
    const error = payload.success
      ? {
          code: "HTTP_ERROR",
          message: `Request failed with status ${response.status}.`,
        }
      : payload.error;

    throw toFetcherError(response.status, error);
  }

  return payload.data;
}

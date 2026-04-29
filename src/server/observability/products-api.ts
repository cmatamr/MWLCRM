import "server-only";

import { logApiRouteError } from "@/server/observability/api-route";

type LogProductsApiErrorInput = {
  request: Request;
  route: string;
  error: unknown;
  httpStatus?: number | null;
};

export async function logProductsApiError(input: LogProductsApiErrorInput): Promise<void> {
  await logApiRouteError({
    request: input.request,
    route: input.route,
    source: "api.products",
    defaultEventType: "products_api_error",
    error: input.error,
    httpStatus: input.httpStatus,
  });
}

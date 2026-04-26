import { logApiRouteError } from "@/server/observability/api-route";
import { funnelSummaryParamsSchema, parseQueryParams } from "@/domain/crm/schemas";
import { ok, handleRouteError } from "@/server/api/http";
import { requireSessionProfile } from "@/server/api/auth";
import { getFunnelSummary } from "@/server/services/funnel";

export async function GET(request: Request) {
  try {
    await requireSessionProfile();
    const summary = await getFunnelSummary(
      parseQueryParams(funnelSummaryParamsSchema, new URL(request.url).searchParams),
    );
    return ok(summary);
  } catch (error) {
    const response = handleRouteError(error);
    await logApiRouteError({
      request: request,
      route: "/api/funnel/summary",
      source: "api.dashboard",
      defaultEventType: "dashboard_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

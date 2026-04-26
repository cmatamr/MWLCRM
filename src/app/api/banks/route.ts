import { buildSyntheticApiRequest, logApiRouteError } from "@/server/observability/api-route";
import { handleRouteError, ok } from "@/server/api/http";
import { requireSessionProfile } from "@/server/api/auth";
import { listActiveBanks } from "@/server/services/banks";

export async function GET() {
  try {
    await requireSessionProfile();
    const banks = await listActiveBanks();
    return ok(banks);
  } catch (error) {
    const response = handleRouteError(error);
    await logApiRouteError({
      request: buildSyntheticApiRequest("/api/banks", "GET"),
      route: "/api/banks",
      source: "api.commercial",
      defaultEventType: "commercial_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

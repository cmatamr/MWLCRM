import { buildSyntheticApiRequest, logApiRouteError } from "@/server/observability/api-route";
import { fail, handleRouteError, ok } from "@/server/api/http";
import { requireRole } from "@/server/api/auth";
import { MetaApiError, runMetaCampaignSync } from "@/server/services/meta-campaign-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireRole("admin");
    const result = await runMetaCampaignSync({ force: true });
    return ok(result);
  } catch (error) {
    if (error instanceof MetaApiError) {
      return fail(
        {
          code: "META_API_ERROR",
          message: error.message,
          details: error.payload,
        },
        { status: error.status },
      );
    }

    const response = handleRouteError(error);
    await logApiRouteError({
      request: buildSyntheticApiRequest("/api/campaigns/sync", "POST"),
      route: "/api/campaigns/sync",
      source: "api.commercial",
      defaultEventType: "commercial_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

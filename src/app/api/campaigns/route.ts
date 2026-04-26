import { logApiRouteError } from "@/server/observability/api-route";
import { listCampaignsParamsSchema, parseQueryParams } from "@/domain/crm/schemas";
import { handleRouteError, ok } from "@/server/api/http";
import { requireSessionProfile } from "@/server/api/auth";
import { listCampaigns } from "@/server/services/campaigns";

export async function GET(request: Request) {
  try {
    await requireSessionProfile();
    const campaigns = await listCampaigns(
      parseQueryParams(listCampaignsParamsSchema, new URL(request.url).searchParams),
    );
    return ok(campaigns);
  } catch (error) {
    const response = handleRouteError(error);
    await logApiRouteError({
      request: request,
      route: "/api/campaigns",
      source: "api.commercial",
      defaultEventType: "commercial_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

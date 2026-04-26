import { logApiRouteError } from "@/server/observability/api-route";
import { crmEntityIdParamsSchema } from "@/domain/crm/schemas";
import {
  handleRouteError,
  notFound,
  ok,
  RouteContext,
} from "@/server/api/http";
import { requireSessionProfile } from "@/server/api/auth";
import { getCampaignDetail } from "@/server/services/campaigns";

export async function GET(_request: Request, context: RouteContext<{ id: string }>) {
  try {
    await requireSessionProfile();
    const campaignId = crmEntityIdParamsSchema.parse(await context.params).id;
    const campaign = await getCampaignDetail(campaignId);

    if (!campaign) {
      throw notFound("Campaign not found.", { id: campaignId });
    }

    return ok(campaign);
  } catch (error) {
    const response = handleRouteError(error);
    await logApiRouteError({
      request: _request,
      route: "/api/campaigns/[id]",
      source: "api.commercial",
      defaultEventType: "commercial_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

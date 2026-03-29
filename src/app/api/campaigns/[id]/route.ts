import { crmEntityIdParamsSchema } from "@/domain/crm/schemas";
import {
  handleRouteError,
  notFound,
  ok,
  RouteContext,
} from "@/server/api/http";
import { getCampaignDetail } from "@/server/services/campaigns";

export async function GET(_request: Request, context: RouteContext<{ id: string }>) {
  try {
    const campaignId = crmEntityIdParamsSchema.parse(await context.params).id;
    const campaign = await getCampaignDetail(campaignId);

    if (!campaign) {
      throw notFound("Campaign not found.", { id: campaignId });
    }

    return ok(campaign);
  } catch (error) {
    return handleRouteError(error);
  }
}

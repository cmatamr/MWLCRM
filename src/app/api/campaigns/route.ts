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
    return handleRouteError(error);
  }
}

import { funnelSummaryParamsSchema, parseQueryParams } from "@/domain/crm/schemas";
import { ok, handleRouteError } from "@/server/api/http";
import { getFunnelSummary } from "@/server/services/funnel";

export async function GET(request: Request) {
  try {
    const summary = await getFunnelSummary(
      parseQueryParams(funnelSummaryParamsSchema, new URL(request.url).searchParams),
    );
    return ok(summary);
  } catch (error) {
    return handleRouteError(error);
  }
}

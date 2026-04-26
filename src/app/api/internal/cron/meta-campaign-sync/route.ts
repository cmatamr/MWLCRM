import { logApiRouteError } from "@/server/observability/api-route";
import { campaignSyncConfig } from "@/config/campaignSync";
import { fail, handleRouteError, ok } from "@/server/api/http";
import { MetaApiError, runMetaCampaignSync } from "@/server/services/meta-campaign-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return fail(
      {
        code: "UNAUTHORIZED",
        message: "Unauthorized cron request.",
      },
      { status: 401 },
    );
  }

  try {
    const result = await runMetaCampaignSync();
    return ok({
      ...result,
      routePath: campaignSyncConfig.cron.routePath,
    });
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
      request: request,
      route: "/api/internal/cron/meta-campaign-sync",
      source: "api.internal",
      defaultEventType: "internal_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

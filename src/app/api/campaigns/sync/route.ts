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

    return handleRouteError(error);
  }
}

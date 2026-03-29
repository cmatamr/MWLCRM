import { ok, handleRouteError } from "@/server/api/http";
import { getFunnelSummary } from "@/server/services/funnel";

export async function GET() {
  try {
    const summary = await getFunnelSummary();
    return ok(summary);
  } catch (error) {
    return handleRouteError(error);
  }
}

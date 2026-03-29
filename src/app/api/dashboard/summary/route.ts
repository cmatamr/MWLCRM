import { ok, handleRouteError } from "@/server/api/http";
import { getDashboardSummary } from "@/server/services/dashboard";

export async function GET() {
  try {
    const summary = await getDashboardSummary();
    return ok(summary);
  } catch (error) {
    return handleRouteError(error);
  }
}

import { handleRouteError, ok } from "@/server/api/http";
import { requireSessionProfile } from "@/server/api/auth";
import { listActiveBanks } from "@/server/services/banks";

export async function GET() {
  try {
    await requireSessionProfile();
    const banks = await listActiveBanks();
    return ok(banks);
  } catch (error) {
    return handleRouteError(error);
  }
}

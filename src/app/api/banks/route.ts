import { handleRouteError, ok } from "@/server/api/http";
import { listActiveBanks } from "@/server/services/banks";

export async function GET() {
  try {
    const banks = await listActiveBanks();
    return ok(banks);
  } catch (error) {
    return handleRouteError(error);
  }
}

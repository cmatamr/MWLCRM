import { ok, handleRouteError } from "@/server/api/http";
import {
  getDashboardSummary,
  SUPPORTED_DASHBOARD_DAILY_SALES_DAYS,
  type DashboardDailySalesRangeDays,
} from "@/server/services/dashboard";

function parseRevenueWindowDays(request: Request): DashboardDailySalesRangeDays | undefined {
  const { searchParams } = new URL(request.url);
  const rawDays = searchParams.get("days");

  if (!rawDays) {
    return undefined;
  }

  const days = Number.parseInt(rawDays, 10);
  if (
    Number.isNaN(days) ||
    !SUPPORTED_DASHBOARD_DAILY_SALES_DAYS.includes(days as DashboardDailySalesRangeDays)
  ) {
    return undefined;
  }

  return days as DashboardDailySalesRangeDays;
}

export async function GET(request: Request) {
  try {
    const summary = await getDashboardSummary({
      revenueWindowDays: parseRevenueWindowDays(request),
    });
    return ok(summary);
  } catch (error) {
    return handleRouteError(error);
  }
}

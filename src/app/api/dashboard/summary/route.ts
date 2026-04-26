import { logApiRouteError } from "@/server/observability/api-route";
import { OrderStatusEnum } from "@prisma/client";

import { ok, handleRouteError } from "@/server/api/http";
import { requireSessionProfile } from "@/server/api/auth";
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

function parseRecentOrdersStatus(request: Request): OrderStatusEnum | undefined {
  const { searchParams } = new URL(request.url);
  const rawStatus = searchParams.get("status")?.trim();

  if (!rawStatus) {
    return undefined;
  }

  return Object.values(OrderStatusEnum).includes(rawStatus as OrderStatusEnum)
    ? (rawStatus as OrderStatusEnum)
    : undefined;
}

export async function GET(request: Request) {
  try {
    await requireSessionProfile();
    const summary = await getDashboardSummary({
      revenueWindowDays: parseRevenueWindowDays(request),
      recentOrdersStatus: parseRecentOrdersStatus(request),
    });
    return ok(summary);
  } catch (error) {
    const response = handleRouteError(error);
    await logApiRouteError({
      request: request,
      route: "/api/dashboard/summary",
      source: "api.dashboard",
      defaultEventType: "dashboard_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

import { logApiRouteError } from "@/server/observability/api-route";
export const dynamic = "force-dynamic";

import { listConversationsParamsSchema, parseQueryParams } from "@/domain/crm/schemas";
import { handleRouteError, ok } from "@/server/api/http";
import { requireSessionProfile } from "@/server/api/auth";
import { listConversations } from "@/server/services/conversations";

export async function GET(request: Request) {
  try {
    await requireSessionProfile();
    const conversations = await listConversations(
      parseQueryParams(listConversationsParamsSchema, new URL(request.url).searchParams),
    );
    return ok(conversations);
  } catch (error) {
    const response = handleRouteError(error);
    await logApiRouteError({
      request: request,
      route: "/api/conversations",
      source: "api.messages",
      defaultEventType: "messages_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

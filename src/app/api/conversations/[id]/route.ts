import { logApiRouteError } from "@/server/observability/api-route";
export const dynamic = "force-dynamic";

import { crmEntityIdParamsSchema } from "@/domain/crm/schemas";
import {
  handleRouteError,
  notFound,
  ok,
  RouteContext,
} from "@/server/api/http";
import { requireSessionProfile } from "@/server/api/auth";
import { getConversationDetail } from "@/server/services/conversations";

export async function GET(_request: Request, context: RouteContext<{ id: string }>) {
  try {
    await requireSessionProfile();
    const conversationId = crmEntityIdParamsSchema.parse(await context.params).id;
    const conversation = await getConversationDetail(conversationId);

    if (!conversation) {
      throw notFound("Conversation not found.", { id: conversationId });
    }

    return ok(conversation);
  } catch (error) {
    const response = handleRouteError(error);
    await logApiRouteError({
      request: _request,
      route: "/api/conversations/[id]",
      source: "api.messages",
      defaultEventType: "messages_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

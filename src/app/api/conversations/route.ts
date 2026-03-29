import { listConversationsParamsSchema, parseQueryParams } from "@/domain/crm/schemas";
import { handleRouteError, ok } from "@/server/api/http";
import { listConversations } from "@/server/services/conversations";

export async function GET(request: Request) {
  try {
    const conversations = await listConversations(
      parseQueryParams(listConversationsParamsSchema, new URL(request.url).searchParams),
    );
    return ok(conversations);
  } catch (error) {
    return handleRouteError(error);
  }
}

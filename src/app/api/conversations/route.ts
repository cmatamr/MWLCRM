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
    return handleRouteError(error);
  }
}

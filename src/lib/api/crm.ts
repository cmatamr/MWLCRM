import type { ApiResponse, ApiErrorBody } from "@/types/api";
import type { DashboardSummary } from "@/server/services/dashboard/types";
import type {
  CustomerDetail,
  CustomersListResponse,
  ListCustomersParams,
} from "@/server/services/customers/types";
import type { CampaignKpis, CampaignsListResponse, ListCampaignsParams } from "@/server/services/campaigns/types";
import type { ConversationsListResponse, ListConversationsParams } from "@/server/services/conversations/types";
import type { FunnelSummary } from "@/server/services/funnel/types";
import type { ListOrdersParams, OrderDetail, OrdersListResponse } from "@/server/services/orders/types";

type QueryPrimitive = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryPrimitive>;
type QueryInput = object;

export class ApiClientError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(input: {
    status: number;
    code: string;
    message: string;
    details?: unknown;
  }) {
    super(input.message);
    this.name = "ApiClientError";
    this.status = input.status;
    this.code = input.code;
    this.details = input.details;
  }
}

function buildUrl(path: string, query?: QueryInput, baseUrl = "") {
  const url = new URL(path, baseUrl || "http://localhost");

  if (query) {
    for (const [key, value] of Object.entries(query as QueryParams)) {
      if (value == null || value === "") {
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  if (!baseUrl) {
    return `${url.pathname}${url.search}`;
  }

  return url.toString();
}

async function parseApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  try {
    return (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiClientError({
      status: response.status,
      code: "INVALID_JSON_RESPONSE",
      message: "The API returned an invalid JSON response.",
    });
  }
}

function toApiClientError(status: number, error: ApiErrorBody) {
  return new ApiClientError({
    status,
    code: error.code,
    message: error.message,
    details: error.details,
  });
}

export interface CrmApiClientOptions {
  baseUrl?: string;
  fetcher?: typeof fetch;
}

export function createCrmApiClient(options: CrmApiClientOptions = {}) {
  const fetcher = options.fetcher ?? fetch;
  const baseUrl = options.baseUrl ?? "";

  async function get<T>(path: string, query?: QueryInput, init?: RequestInit): Promise<T> {
    const response = await fetcher(buildUrl(path, query, baseUrl), {
      method: "GET",
      ...init,
      headers: {
        Accept: "application/json",
        ...init?.headers,
      },
      cache: init?.cache ?? "no-store",
    });

    const payload = await parseApiResponse<T>(response);

    if (!response.ok || !payload.success) {
      const error = payload.success
        ? {
            code: "HTTP_ERROR",
            message: `Request failed with status ${response.status}.`,
          }
        : payload.error;

      throw toApiClientError(response.status, error);
    }

    return payload.data;
  }

  return {
    getDashboardSummary(init?: RequestInit) {
      return get<DashboardSummary>("/api/dashboard/summary", undefined, init);
    },
    listCustomers(params?: ListCustomersParams, init?: RequestInit) {
      return get<CustomersListResponse>("/api/customers", params, init);
    },
    getCustomer(id: string, init?: RequestInit) {
      return get<CustomerDetail>(`/api/customers/${id}`, undefined, init);
    },
    listOrders(params?: ListOrdersParams, init?: RequestInit) {
      return get<OrdersListResponse>("/api/orders", params, init);
    },
    getOrder(id: string, init?: RequestInit) {
      return get<OrderDetail>(`/api/orders/${id}`, undefined, init);
    },
    listCampaigns(params?: ListCampaignsParams, init?: RequestInit) {
      return get<CampaignsListResponse>("/api/campaigns", params, init);
    },
    getCampaign(id: string, init?: RequestInit) {
      return get<CampaignKpis>(`/api/campaigns/${id}`, undefined, init);
    },
    getFunnelSummary(init?: RequestInit) {
      return get<FunnelSummary>("/api/funnel/summary", undefined, init);
    },
    listConversations(params?: ListConversationsParams, init?: RequestInit) {
      return get<ConversationsListResponse>("/api/conversations", params, init);
    },
  };
}

export const crmApiClient = createCrmApiClient();

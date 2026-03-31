import type { DashboardSummary } from "@/server/services/dashboard/types";
import type { DashboardDailySalesRangeDays } from "@/server/services/dashboard/types";
import type {
  CustomerDetail,
  CustomersListResponse,
  ListCustomersParams,
} from "@/server/services/customers/types";
import type { CampaignKpis, CampaignsListResponse, ListCampaignsParams } from "@/server/services/campaigns/types";
import type {
  ConversationDetail,
  ConversationsListResponse,
  ListConversationsParams,
} from "@/server/services/conversations/types";
import type { FunnelSummary } from "@/server/services/funnel/types";
import type {
  ListOrdersParams,
  OrderDetail,
  OrderPaymentConfirmationResult,
  OrdersListResponse,
} from "@/server/services/orders/types";
import { buildApiUrl, fetcher, FetcherError, type QueryParams } from "@/lib/fetcher";

type QueryInput = object;

export { FetcherError as ApiClientError };
type ApiFetcher = <T>(input: string, init?: RequestInit) => Promise<T>;

export interface CrmApiClientOptions {
  baseUrl?: string;
  fetcher?: ApiFetcher;
}

export function createCrmApiClient(options: CrmApiClientOptions = {}) {
  const apiFetcher = options.fetcher ?? fetcher;
  const baseUrl = options.baseUrl ?? "";

  async function get<T>(path: string, query?: QueryInput, init?: RequestInit): Promise<T> {
    return apiFetcher<T>(buildApiUrl(path, query as QueryParams | undefined, baseUrl), init);
  }

  return {
    getDashboardSummary(
      params?: { days?: DashboardDailySalesRangeDays },
      init?: RequestInit,
    ) {
      return get<DashboardSummary>("/api/dashboard/summary", params, init);
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
    confirmOrderPayment(id: string, init?: RequestInit) {
      return get<OrderPaymentConfirmationResult>(`/api/orders/${id}`, undefined, {
        method: "PATCH",
        body: JSON.stringify({
          action: "confirm_payment",
        }),
        headers: {
          "Content-Type": "application/json",
          ...init?.headers,
        },
        ...init,
      });
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
    getConversation(id: string, init?: RequestInit) {
      return get<ConversationDetail>(`/api/conversations/${id}`, undefined, init);
    },
  };
}

export const crmApiClient = createCrmApiClient();

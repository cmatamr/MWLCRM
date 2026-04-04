import type { OrderStatusEnum } from "@prisma/client";

import type { DashboardSummary } from "@/server/services/dashboard/types";
import type { DashboardDailySalesRangeDays } from "@/server/services/dashboard/types";
import type { BankListItem } from "@/server/services/orders/types";
import type {
  CreateCustomerInput,
  CustomerDetail,
  CustomersListResponse,
  ListCustomersParams,
  UpdateCustomerInput,
} from "@/server/services/customers/types";
import type {
  CampaignDetail,
  CampaignsListResponse,
  ListCampaignsParams,
} from "@/server/services/campaigns/types";
import type {
  ConversationDetail,
  ConversationsListResponse,
  ListConversationsParams,
} from "@/server/services/conversations/types";
import type { FunnelSummary, FunnelSummaryParams } from "@/server/services/funnel/types";
import type {
  CreateOrderActivityInput,
  CreatePaymentReceiptInput,
  CreateOrderInput,
  DeleteOrderResult,
  ListOrdersParams,
  OrderDetail,
  OrderItemProductOption,
  OrderPaymentConfirmationResult,
  OrdersListResponse,
  PaymentReceiptReviewActionInput,
  UpdatePaymentReceiptInput,
  UpdateOrderActivityInput,
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
    listBanks(init?: RequestInit) {
      return get<BankListItem[]>("/api/banks", undefined, init);
    },
    getDashboardSummary(
      params?: { days?: DashboardDailySalesRangeDays; status?: OrderStatusEnum },
      init?: RequestInit,
    ) {
      return get<DashboardSummary>("/api/dashboard/summary", params, init);
    },
    listCustomers(params?: ListCustomersParams, init?: RequestInit) {
      return get<CustomersListResponse>("/api/customers", params, init);
    },
    createCustomer(input: CreateCustomerInput, init?: RequestInit) {
      return get<CustomersListResponse["items"][number]>("/api/customers", undefined, {
        method: "POST",
        body: JSON.stringify(input),
        headers: {
          "Content-Type": "application/json",
          ...init?.headers,
        },
        ...init,
      });
    },
    getCustomer(id: string, init?: RequestInit) {
      return get<CustomerDetail>(`/api/customers/${id}`, undefined, init);
    },
    updateCustomer(id: string, input: UpdateCustomerInput, init?: RequestInit) {
      return get<CustomerDetail>(`/api/customers/${id}`, undefined, {
        method: "PATCH",
        body: JSON.stringify(input),
        headers: {
          "Content-Type": "application/json",
          ...init?.headers,
        },
        ...init,
      });
    },
    listOrders(params?: ListOrdersParams, init?: RequestInit) {
      return get<OrdersListResponse>("/api/orders", params, init);
    },
    getOrder(id: string, init?: RequestInit) {
      return get<OrderDetail>(`/api/orders/${id}`, undefined, init);
    },
    deleteOrder(id: string, init?: RequestInit) {
      return get<DeleteOrderResult>(`/api/orders/${id}`, undefined, {
        method: "DELETE",
        ...init,
      });
    },
    updateOrderDeliveryDate(id: string, deliveryDate: string | null, init?: RequestInit) {
      return get<OrderDetail>(`/api/orders/${id}/delivery-date`, undefined, {
        method: "PATCH",
        body: JSON.stringify({
          deliveryDate,
        }),
        headers: {
          "Content-Type": "application/json",
          ...init?.headers,
        },
        ...init,
      });
    },
    getOrderItemProductOptions(orderId: string, query?: string, init?: RequestInit) {
      return get<OrderItemProductOption[]>(`/api/orders/${orderId}/items/products`, { query }, init);
    },
    listOrderCatalogProductOptions(query?: string, init?: RequestInit) {
      return get<OrderItemProductOption[]>("/api/orders/item-products", { query }, init);
    },
    createOrder(input: CreateOrderInput, init?: RequestInit) {
      return get<OrderDetail>("/api/orders", undefined, {
        method: "POST",
        body: JSON.stringify(input),
        headers: {
          "Content-Type": "application/json",
          ...init?.headers,
        },
        ...init,
      });
    },
    createOrderActivity(orderId: string, input: CreateOrderActivityInput, init?: RequestInit) {
      return get<OrderDetail>(`/api/orders/${orderId}/activity`, undefined, {
        method: "POST",
        body: JSON.stringify(input),
        headers: {
          "Content-Type": "application/json",
          ...init?.headers,
        },
        ...init,
      });
    },
    deleteOrderActivity(orderId: string, activityId: string, init?: RequestInit) {
      return get<OrderDetail>(`/api/orders/${orderId}/activity/${activityId}`, undefined, {
        method: "DELETE",
        ...init,
      });
    },
    updateOrderActivity(
      orderId: string,
      activityId: string,
      input: UpdateOrderActivityInput,
      init?: RequestInit,
    ) {
      return get<OrderDetail>(`/api/orders/${orderId}/activity/${activityId}`, undefined, {
        method: "PATCH",
        body: JSON.stringify(input),
        headers: {
          "Content-Type": "application/json",
          ...init?.headers,
        },
        ...init,
      });
    },
    createOrderItem(orderId: string, productId: string, quantity: number, init?: RequestInit) {
      return get<OrderDetail>(`/api/orders/${orderId}/items`, undefined, {
        method: "POST",
        body: JSON.stringify({
          productId,
          quantity,
        }),
        headers: {
          "Content-Type": "application/json",
          ...init?.headers,
        },
        ...init,
      });
    },
    updateOrderItemQuantity(orderId: string, itemId: string, quantity: number, init?: RequestInit) {
      return get<OrderDetail>(`/api/orders/${orderId}/items/${itemId}`, undefined, {
        method: "PATCH",
        body: JSON.stringify({
          quantity,
        }),
        headers: {
          "Content-Type": "application/json",
          ...init?.headers,
        },
        ...init,
      });
    },
    deleteOrderItem(orderId: string, itemId: string, init?: RequestInit) {
      return get<OrderDetail>(`/api/orders/${orderId}/items/${itemId}`, undefined, {
        method: "DELETE",
        ...init,
      });
    },
    updateOrderItemDeliveryDate(
      orderId: string,
      itemId: string,
      deliveryDate: string | null,
      init?: RequestInit,
    ) {
      return get<OrderDetail>(`/api/orders/${orderId}/items/${itemId}/delivery-date`, undefined, {
        method: "PATCH",
        body: JSON.stringify({
          deliveryDate,
        }),
        headers: {
          "Content-Type": "application/json",
          ...init?.headers,
        },
        ...init,
      });
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
    validatePaymentReceipt(
      orderId: string,
      receiptId: string,
      input: { performedBy: string; internalNotes?: string | null },
      init?: RequestInit,
    ) {
      return get<OrderDetail>(`/api/orders/${orderId}/receipts/${receiptId}/validate`, undefined, {
        method: "POST",
        body: JSON.stringify(input),
        headers: {
          "Content-Type": "application/json",
          ...init?.headers,
        },
        ...init,
      });
    },
    createPaymentReceipt(orderId: string, input: CreatePaymentReceiptInput, init?: RequestInit) {
      return get<OrderDetail>(`/api/orders/${orderId}/receipts`, undefined, {
        method: "POST",
        body: JSON.stringify(input),
        headers: {
          "Content-Type": "application/json",
          ...init?.headers,
        },
        ...init,
      });
    },
    updatePaymentReceipt(
      orderId: string,
      receiptId: string,
      input: UpdatePaymentReceiptInput,
      init?: RequestInit,
    ) {
      return get<OrderDetail>(`/api/orders/${orderId}/receipts/${receiptId}`, undefined, {
        method: "PATCH",
        body: JSON.stringify(input),
        headers: {
          "Content-Type": "application/json",
          ...init?.headers,
        },
        ...init,
      });
    },
    deletePaymentReceipt(
      orderId: string,
      receiptId: string,
      input: PaymentReceiptReviewActionInput,
      init?: RequestInit,
    ) {
      return get<OrderDetail>(`/api/orders/${orderId}/receipts/${receiptId}`, undefined, {
        method: "DELETE",
        body: JSON.stringify(input),
        headers: {
          "Content-Type": "application/json",
          ...init?.headers,
        },
        ...init,
      });
    },
    rejectPaymentReceipt(
      orderId: string,
      receiptId: string,
      input: PaymentReceiptReviewActionInput,
      init?: RequestInit,
    ) {
      return get<OrderDetail>(`/api/orders/${orderId}/receipts/${receiptId}/reject`, undefined, {
        method: "POST",
        body: JSON.stringify(input),
        headers: {
          "Content-Type": "application/json",
          ...init?.headers,
        },
        ...init,
      });
    },
    cancelPaymentReceipt(
      orderId: string,
      receiptId: string,
      input: PaymentReceiptReviewActionInput,
      init?: RequestInit,
    ) {
      return get<OrderDetail>(`/api/orders/${orderId}/receipts/${receiptId}/cancel`, undefined, {
        method: "POST",
        body: JSON.stringify(input),
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
      return get<CampaignDetail>(`/api/campaigns/${id}`, undefined, init);
    },
    getFunnelSummary(params?: FunnelSummaryParams, init?: RequestInit) {
      return get<FunnelSummary>("/api/funnel/summary", params, init);
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

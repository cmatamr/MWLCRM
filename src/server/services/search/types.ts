import type { ChannelType, OrderStatusEnum } from "@prisma/client";

export interface CustomerSearchResult {
  id: string;
  displayName: string | null;
  externalId: string;
  primaryChannel: ChannelType;
  customerStatus: string | null;
  totalOrders: number;
  totalSpentCrc: number;
  lastOrderAt: string | null;
  createdAt: string;
  href: string;
}

export interface OrderSearchResult {
  id: string;
  status: OrderStatusEnum;
  paymentStatus: string;
  totalCrc: number;
  createdAt: string;
  customer: {
    id: string | null;
    name: string | null;
    externalId: string | null;
  };
  href: string;
}

export interface CampaignSearchResult {
  id: string;
  name: string;
  platform: string | null;
  objective: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string | null;
  href: string;
}

export interface GlobalSearchResults {
  query: string;
  customers: CustomerSearchResult[];
  orders: OrderSearchResult[];
  campaigns: CampaignSearchResult[];
  totalResults: number;
}

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface StatusBadgeViewModel {
  label: string;
  tone: BadgeTone;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PagedResponse<TItem> {
  items: TItem[];
  pagination: PaginationMeta;
}

export interface CustomerReference {
  id: string | null;
  name: string | null;
}

export interface CustomerReferenceWithExternalId extends CustomerReference {
  externalId: string | null;
}

export interface ConversationReference {
  id: string;
  leadThreadKey: string;
}

export type QueryParamValue = string | string[] | undefined;

export type QueryParamRecord = Record<string, QueryParamValue>;

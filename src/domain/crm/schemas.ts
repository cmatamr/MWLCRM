import { ChannelType, LeadStageType, OrderStatusEnum } from "@prisma/client";
import { z } from "zod";

import type { QueryParamRecord, QueryParamValue } from "./common";
import { customerSortValues } from "./customers";
import { orderSortValues } from "./orders";

function readQueryValue(value: QueryParamValue): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  const rawValue = normalizeOptionalString(value);

  if (!rawValue) {
    return undefined;
  }

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function normalizeNullableDateString(value: unknown): string | null | undefined {
  if (value == null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isValidIsoDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parts = value.split("-").map((part) => Number(part));

  if (parts.length !== 3) {
    return false;
  }

  const year = parts[0] ?? Number.NaN;
  const month = parts[1] ?? Number.NaN;
  const day = parts[2] ?? Number.NaN;
  const candidate = new Date(Date.UTC(year, month - 1, day));

  return (
    Number.isFinite(candidate.getTime()) &&
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

const optionalQueryString = z.preprocess(
  normalizeOptionalString,
  z.string().min(1).optional(),
);

const optionalPositiveInt = z.preprocess(
  normalizeOptionalNumber,
  z.number().int().positive().optional(),
);

const optionalPageSize = z.preprocess(
  normalizeOptionalNumber,
  z.number().int().min(1).max(100).optional(),
);

export const crmEntityIdParamsSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

export const orderItemRouteParamsSchema = z
  .object({
    id: z.string().uuid(),
    itemId: z.coerce.bigint().positive(),
  })
  .strict();

export const orderPaymentActionSchema = z
  .object({
    action: z.literal("confirm_payment"),
  })
  .strict();

export const updateOrderItemQuantitySchema = z
  .object({
    quantity: z.number().int().positive(),
  })
  .strict();

export const updateOrderItemDeliveryDateSchema = z
  .object({
    deliveryDate: z.preprocess(
      normalizeNullableDateString,
      z.union([z.string().refine(isValidIsoDateOnly, "Invalid delivery date."), z.null()]),
    ),
  })
  .strict();

export const updateOrderDeliveryDateSchema = z
  .object({
    deliveryDate: z.preprocess(
      normalizeNullableDateString,
      z.union([z.string().refine(isValidIsoDateOnly, "Invalid delivery date."), z.null()]),
    ),
  })
  .strict();

export const createOrderItemSchema = z
  .object({
    productId: z.string().trim().min(1),
    quantity: z.number().int().positive(),
  })
  .strict();

export const createOrderSchema = z
  .object({
    customerId: z.string().uuid(),
    items: z.array(createOrderItemSchema).min(1),
  })
  .strict();

export const dashboardSummaryFiltersSchema = z
  .object({
    rangeDays: optionalPositiveInt,
  })
  .strict();

export const listCustomersParamsSchema = z
  .object({
    page: optionalPositiveInt,
    pageSize: optionalPageSize,
    search: optionalQueryString,
    status: optionalQueryString,
    channel: z.nativeEnum(ChannelType).optional(),
    sort: z.enum(customerSortValues).optional(),
  })
  .strict();

export const createCustomerSchema = z
  .object({
    primaryChannel: z.nativeEnum(ChannelType),
    externalId: z.string().trim().min(1, "External ID is required."),
    displayName: z.string().trim().min(1, "Display name is required."),
    customerStatus: optionalQueryString,
  })
  .strict();

export const listOrdersParamsSchema = z
  .object({
    page: optionalPositiveInt,
    pageSize: optionalPageSize,
    search: optionalQueryString,
    status: z.nativeEnum(OrderStatusEnum).optional(),
    paymentStatus: optionalQueryString,
    sort: z.enum(orderSortValues).optional(),
  })
  .strict();

export const listCampaignsParamsSchema = z
  .object({
    page: optionalPositiveInt,
    pageSize: optionalPageSize,
    search: optionalQueryString,
  })
  .strict();

export const listConversationsParamsSchema = z
  .object({
    page: optionalPositiveInt,
    pageSize: optionalPageSize,
    search: optionalQueryString,
    stage: z.nativeEnum(LeadStageType).optional(),
    owner: optionalQueryString,
  })
  .strict();

export const conversationSelectionParamsSchema = z
  .object({
    threadId: z.string().uuid().optional(),
  })
  .strict();

export function normalizeQueryParams(input: URLSearchParams | QueryParamRecord) {
  if (input instanceof URLSearchParams) {
    return Object.fromEntries(input.entries());
  }

  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, readQueryValue(value)]),
  );
}

export function parseQueryParams<TSchema extends z.ZodType>(
  schema: TSchema,
  input: URLSearchParams | QueryParamRecord,
): z.infer<TSchema> {
  return schema.parse(normalizeQueryParams(input));
}

export function safeParseQueryParams<TSchema extends z.ZodType>(
  schema: TSchema,
  input: URLSearchParams | QueryParamRecord,
) {
  return schema.safeParse(normalizeQueryParams(input));
}

import { Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";

export type ServiceDbClient = typeof prisma;

export interface ServiceOptions {
  db?: ServiceDbClient;
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

export function resolveDb(options?: ServiceOptions): ServiceDbClient {
  return options?.db ?? prisma;
}

export function normalizePagination(params?: PaginationParams) {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params?.pageSize ?? 20));

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function createPaginationMeta(input: {
  page: number;
  pageSize: number;
  total: number;
}): PaginationMeta {
  return {
    page: input.page,
    pageSize: input.pageSize,
    total: input.total,
    totalPages: Math.max(1, Math.ceil(input.total / input.pageSize)),
  };
}

export function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value == null) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  return value.toNumber();
}

export function toNullableIsoDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function calculatePercentage(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }

  return Number(((numerator / denominator) * 100).toFixed(2));
}

export function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(2));
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

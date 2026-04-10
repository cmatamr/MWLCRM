"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { orderSortValues } from "@/domain/crm";
import { useOrders } from "@/hooks/use-orders";
import { Button } from "@/components/ui/button";
import { CreateOrderModal } from "@/components/orders/create-order-modal";
import { PageHeader } from "@/components/layout/page-header";
import { OrdersTable } from "@/components/orders/orders-table";
import { formatOrderStatusLabel, formatPaymentStatusLabel } from "@/components/orders/order-presenters";
import { PageLoading } from "@/components/ui/page-loading";
import { StateDisplay } from "@/components/ui/state-display";
import type { ListOrdersParams, OrderSort } from "@/server/services/orders/types";

type OrdersPageClientProps = {
  paymentStatusOptions: string[];
  orderStatusOptions: NonNullable<ListOrdersParams["status"]>[];
};

function parsePositiveInteger(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : undefined;
}

function toListParams(
  searchParams: URLSearchParams,
  paymentStatusOptions: string[],
  orderStatusOptions: string[],
): ListOrdersParams {
  const rawStatus = searchParams.get("status");
  const rawPaymentStatus = searchParams.get("paymentStatus");
  const rawSearch = searchParams.get("search")?.trim();
  const rawOrderId = searchParams.get("orderId")?.trim();
  const effectiveSearch = rawSearch || rawOrderId || undefined;
  const rawSort = searchParams.get("sort");

  return {
    page: parsePositiveInteger(searchParams.get("page")) ?? 1,
    pageSize: 12,
    search: effectiveSearch,
    status:
      rawStatus && orderStatusOptions.includes(rawStatus)
        ? (rawStatus as ListOrdersParams["status"])
        : undefined,
    paymentStatus:
      rawPaymentStatus && paymentStatusOptions.includes(rawPaymentStatus)
        ? rawPaymentStatus
        : undefined,
    sort:
      rawSort && orderSortValues.includes(rawSort as OrderSort)
        ? (rawSort as OrderSort)
        : orderSortValues[0],
  };
}

function buildOrdersHref(params: ListOrdersParams) {
  const query = new URLSearchParams();

  query.set("page", String(params.page ?? 1));

  if (params.search) {
    query.set("search", params.search);
  }

  if (params.status) {
    query.set("status", params.status);
  }

  if (params.paymentStatus) {
    query.set("paymentStatus", params.paymentStatus);
  }

  if (params.sort) {
    query.set("sort", params.sort);
  }

  return `/orders?${query.toString()}`;
}

function PaginationButton(props: {
  disabled: boolean;
  href: string;
  label: string;
}) {
  if (props.disabled) {
    return (
      <Button variant="outline" disabled>
        {props.label}
      </Button>
    );
  }

  return (
    <Button asChild variant="outline">
      <Link href={props.href}>{props.label}</Link>
    </Button>
  );
}

export function OrdersPageClient({
  paymentStatusOptions,
  orderStatusOptions,
}: OrdersPageClientProps) {
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const params = toListParams(
    new URLSearchParams(searchParamsKey),
    paymentStatusOptions,
    orderStatusOptions,
  );
  const { data, isLoading, isError, error } = useOrders(params);

  if (isLoading && !data) {
    return <PageLoading tables={2} />;
  }

  if (isError || !data) {
    return (
      <StateDisplay
        tone="error"
        title="No pudimos cargar las órdenes"
        description={error?.message ?? "Ocurrió un error controlado al consultar este módulo."}
      />
    );
  }

  const previousPage = Math.max(1, data.pagination.page - 1);
  const nextPage = Math.min(data.pagination.totalPages, data.pagination.page + 1);

  return (
    <div className="space-y-8">
      <CreateOrderModal isOpen={isCreateOrderOpen} onClose={() => setIsCreateOrderOpen(false)} />

      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <PageHeader
          title="Orders"
          description="Módulo transaccional para operar pedidos, validar pagos y seguir el estado comercial con datos reales."
        />
        <div className="rounded-2xl border border-border/70 bg-white/80 px-4 py-3 text-sm text-muted-foreground">
          {data.pagination.total} órdenes encontradas
        </div>
      </div>

      <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)]">
        <form
          key={searchParamsKey}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-[repeat(2,minmax(0,0.8fr))_auto]"
          method="get"
        >
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Status
            </span>
            <select
              defaultValue={params.status ?? ""}
              name="status"
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary"
            >
              <option value="">Todos</option>
              {orderStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatOrderStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Payment status
            </span>
            <select
              defaultValue={params.paymentStatus ?? ""}
              name="paymentStatus"
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary"
            >
              <option value="">Todos</option>
              {paymentStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatPaymentStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>

          <input type="hidden" name="page" value="1" />

          <div className="flex flex-wrap gap-3 md:items-end">
            <Button type="submit">Aplicar filtros</Button>
            <Button asChild variant="outline">
              <Link href="/orders">Limpiar</Link>
            </Button>
          </div>
        </form>
      </section>

      <OrdersTable
        orders={data.items}
        action={
          <Button type="button" onClick={() => setIsCreateOrderOpen(true)}>
            Nueva orden
          </Button>
        }
      />

      <section className="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)] sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Página {data.pagination.page} de {data.pagination.totalPages}
        </div>
        <div className="flex flex-wrap gap-3">
          <PaginationButton
            disabled={data.pagination.page <= 1}
            href={buildOrdersHref({
              ...params,
              page: previousPage,
            })}
            label="Anterior"
          />
          <PaginationButton
            disabled={data.pagination.page >= data.pagination.totalPages}
            href={buildOrdersHref({
              ...params,
              page: nextPage,
            })}
            label="Siguiente"
          />
        </div>
      </section>
    </div>
  );
}

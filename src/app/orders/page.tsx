import Link from "next/link";
import { OrderStatusEnum } from "@prisma/client";

import { orderSortValues, listOrdersParamsSchema, safeParseQueryParams } from "@/domain/crm";
import { OrdersTable } from "@/components/orders/orders-table";
import { formatOrderStatusLabel, formatPaymentStatusLabel } from "@/components/orders/order-presenters";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getOrderFilterOptions, listOrders } from "@/server/services/orders";
import type { ListOrdersParams } from "@/server/services/orders/types";

export const dynamic = "force-dynamic";

type OrdersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function toListParams(
  rawParams: Record<string, string | string[] | undefined>,
  paymentStatusOptions: string[],
): ListOrdersParams {
  const parsed = safeParseQueryParams(listOrdersParamsSchema, rawParams);
  const safeParams = parsed.success ? parsed.data : {};
  const paymentStatus = safeParams.paymentStatus;

  return {
    page: safeParams.page ?? 1,
    pageSize: 12,
    search: safeParams.search,
    status: safeParams.status,
    paymentStatus:
      paymentStatus && paymentStatusOptions.includes(paymentStatus) ? paymentStatus : undefined,
    sort: safeParams.sort ?? orderSortValues[0],
  };
}

function buildOrdersHref(params: ListOrdersParams) {
  const query = new URLSearchParams();

  query.set("page", String(params.page ?? 1));

  if (params.status) {
    query.set("status", params.status);
  }

  if (params.paymentStatus) {
    query.set("paymentStatus", params.paymentStatus);
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

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const filterOptions = await getOrderFilterOptions();
  const params = toListParams(resolvedSearchParams, filterOptions.paymentStatuses);
  const orders = await listOrders(params);

  const previousPage = Math.max(1, orders.pagination.page - 1);
  const nextPage = Math.min(orders.pagination.totalPages, orders.pagination.page + 1);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <PageHeader
          title="Orders"
          description="Módulo transaccional para operar pedidos, validar pagos y seguir el estado comercial con datos reales."
        />
        <div className="rounded-2xl border border-border/70 bg-white/80 px-4 py-3 text-sm text-muted-foreground">
          {orders.pagination.total} órdenes encontradas
        </div>
      </div>

      <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-[repeat(2,minmax(0,0.8fr))_auto]" method="get">
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
              {Object.values(OrderStatusEnum).map((status) => (
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
              {filterOptions.paymentStatuses.map((status) => (
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

      <OrdersTable orders={orders.items} />

      <section className="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Página {orders.pagination.page} de {orders.pagination.totalPages}
        </div>
        <div className="flex flex-wrap gap-3">
          <PaginationButton
            disabled={orders.pagination.page <= 1}
            href={buildOrdersHref({
              ...params,
              page: previousPage,
            })}
            label="Anterior"
          />
          <PaginationButton
            disabled={orders.pagination.page >= orders.pagination.totalPages}
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

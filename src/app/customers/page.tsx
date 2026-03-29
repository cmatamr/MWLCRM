import Link from "next/link";
import { ChannelType } from "@prisma/client";

import { customerSortValues, listCustomersParamsSchema, safeParseQueryParams } from "@/domain/crm";
import { CustomersTable } from "@/components/customers/customers-table";
import { formatChannelLabel } from "@/components/customers/customer-presenters";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { listCustomers } from "@/server/services/customers";
import type { ListCustomersParams } from "@/server/services/customers/types";

export const dynamic = "force-dynamic";

type CustomersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const SORT_OPTIONS: Array<{
  value: NonNullable<ListCustomersParams["sort"]>;
  label: string;
}> = [
  { value: "recent", label: "Más recientes" },
  { value: "highest_spent", label: "Mayor gasto" },
  { value: "most_orders", label: "Más órdenes" },
  { value: "name", label: "Nombre" },
];

function toListParams(rawParams: Record<string, string | string[] | undefined>): ListCustomersParams {
  const parsed = safeParseQueryParams(listCustomersParamsSchema, rawParams);
  const safeParams = parsed.success ? parsed.data : {};

  return {
    page: safeParams.page ?? 1,
    pageSize: 12,
    search: safeParams.search,
    status: safeParams.status,
    channel: safeParams.channel,
    sort: safeParams.sort ?? customerSortValues[0],
  };
}

function buildCustomersHref(params: ListCustomersParams) {
  const query = new URLSearchParams();

  query.set("page", String(params.page ?? 1));

  if (params.search) {
    query.set("search", params.search);
  }

  if (params.status) {
    query.set("status", params.status);
  }

  if (params.channel) {
    query.set("channel", params.channel);
  }

  if (params.sort) {
    query.set("sort", params.sort);
  }

  return `/customers?${query.toString()}`;
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

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const params = toListParams(resolvedSearchParams);
  const customers = await listCustomers(params);

  const previousPage = Math.max(1, customers.pagination.page - 1);
  const nextPage = Math.min(customers.pagination.totalPages, customers.pagination.page + 1);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <PageHeader
          title="Customers"
          description="Vista comercial de clientes construida desde contacts y enriquecida con órdenes para seguimiento real de cartera."
        />
        <div className="rounded-2xl border border-border/70 bg-white/80 px-4 py-3 text-sm text-muted-foreground">
          {customers.pagination.total} customers encontrados
        </div>
      </div>

      <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <form className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,0.7fr))]" method="get">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Buscar por nombre o external_id
            </span>
            <input
              defaultValue={params.search ?? ""}
              name="search"
              placeholder="Ej. María, 50688..."
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Estado
            </span>
            <input
              defaultValue={params.status ?? ""}
              name="status"
              placeholder="active, vip, dormant..."
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Canal
            </span>
            <select
              defaultValue={params.channel ?? ""}
              name="channel"
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary"
            >
              <option value="">Todos</option>
              {Object.values(ChannelType).map((channel) => (
                <option key={channel} value={channel}>
                  {formatChannelLabel(channel)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Ordenar por
            </span>
            <select
              defaultValue={params.sort ?? customerSortValues[0]}
              name="sort"
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <input type="hidden" name="page" value="1" />

          <div className="flex flex-wrap gap-3 lg:col-span-4">
            <Button type="submit">Aplicar filtros</Button>
            <Button asChild variant="outline">
              <Link href="/customers">Limpiar</Link>
            </Button>
          </div>
        </form>
      </section>

      <CustomersTable customers={customers.items} />

      <section className="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Página {customers.pagination.page} de {customers.pagination.totalPages}
        </div>
        <div className="flex flex-wrap gap-3">
          <PaginationButton
            disabled={customers.pagination.page <= 1}
            href={buildCustomersHref({
              ...params,
              page: previousPage,
            })}
            label="Anterior"
          />
          <PaginationButton
            disabled={customers.pagination.page >= customers.pagination.totalPages}
            href={buildCustomersHref({
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

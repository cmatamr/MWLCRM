"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { customerSortValues } from "@/domain/crm";
import { CustomersTable } from "@/components/customers/customers-table";
import { formatChannelLabel } from "@/components/customers/customer-presenters";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/page-loading";
import { StateDisplay } from "@/components/ui/state-display";
import { useCustomers } from "@/hooks/use-customers";
import type { ListCustomersParams } from "@/server/services/customers/types";

type CustomersPageClientProps = {
  channelOptions: NonNullable<ListCustomersParams["channel"]>[];
};

const SORT_OPTIONS: Array<{
  value: NonNullable<ListCustomersParams["sort"]>;
  label: string;
}> = [
  { value: "recent", label: "Mas recientes" },
  { value: "highest_spent", label: "Mayor gasto" },
  { value: "most_orders", label: "Mas ordenes" },
  { value: "name", label: "Nombre" },
];

function parsePositiveInteger(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : undefined;
}

function toListParams(
  searchParams: URLSearchParams,
  channelOptions: string[],
): ListCustomersParams {
  const rawSearch = searchParams.get("search")?.trim();
  const rawStatus = searchParams.get("status")?.trim();
  const rawChannel = searchParams.get("channel");
  const rawSort = searchParams.get("sort");

  return {
    page: parsePositiveInteger(searchParams.get("page")) ?? 1,
    pageSize: 12,
    search: rawSearch ? rawSearch : undefined,
    status: rawStatus ? rawStatus : undefined,
    channel:
      rawChannel && channelOptions.includes(rawChannel)
        ? (rawChannel as ListCustomersParams["channel"])
        : undefined,
    sort:
      rawSort && customerSortValues.includes(rawSort as NonNullable<ListCustomersParams["sort"]>)
        ? (rawSort as NonNullable<ListCustomersParams["sort"]>)
        : customerSortValues[0],
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

export function CustomersPageClient({ channelOptions }: CustomersPageClientProps) {
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const params = toListParams(new URLSearchParams(searchParamsKey), channelOptions);
  const { data, isLoading, isError, error } = useCustomers(params);

  if (isLoading && !data) {
    return <PageLoading tables={2} />;
  }

  if (isError || !data) {
    return (
      <StateDisplay
        tone="error"
        title="No pudimos cargar los clientes"
        description={error?.message ?? "Ocurrio un error controlado al consultar este modulo."}
      />
    );
  }

  const previousPage = Math.max(1, data.pagination.page - 1);
  const nextPage = Math.min(data.pagination.totalPages, data.pagination.page + 1);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <PageHeader
          title="Customers"
          description="Vista comercial de clientes construida desde contacts y enriquecida con ordenes para seguimiento real de cartera."
        />
        <div className="rounded-2xl border border-border/70 bg-white/80 px-4 py-3 text-sm text-muted-foreground">
          {data.pagination.total} customers encontrados
        </div>
      </div>

      <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <form
          key={searchParamsKey}
          className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,0.7fr))]"
          method="get"
        >
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Buscar por nombre o external_id
            </span>
            <input
              defaultValue={params.search ?? ""}
              name="search"
              placeholder="Ej. Maria, 50688..."
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
              {channelOptions.map((channel) => (
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

      <CustomersTable customers={data.items} />

      <section className="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Pagina {data.pagination.page} de {data.pagination.totalPages}
        </div>
        <div className="flex flex-wrap gap-3">
          <PaginationButton
            disabled={data.pagination.page <= 1}
            href={buildCustomersHref({
              ...params,
              page: previousPage,
            })}
            label="Anterior"
          />
          <PaginationButton
            disabled={data.pagination.page >= data.pagination.totalPages}
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

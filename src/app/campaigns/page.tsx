import Link from "next/link";

import { CampaignsTable } from "@/components/campaigns/campaigns-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { formatCurrencyCRC } from "@/lib/formatters";
import { listCampaigns } from "@/server/services/campaigns";
import type { ListCampaignsParams } from "@/server/services/campaigns";

export const dynamic = "force-dynamic";

type CampaignsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toListParams(rawParams: Record<string, string | string[] | undefined>): ListCampaignsParams {
  return {
    page: parsePositiveInt(readSingleValue(rawParams.page), 1),
    pageSize: 12,
    search: readSingleValue(rawParams.search)?.trim() || undefined,
  };
}

function buildCampaignsHref(params: ListCampaignsParams) {
  const query = new URLSearchParams();

  query.set("page", String(params.page ?? 1));

  if (params.search) {
    query.set("search", params.search);
  }

  return `/campaigns?${query.toString()}`;
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

export default async function CampaignsPage({ searchParams }: CampaignsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const params = toListParams(resolvedSearchParams);
  const campaigns = await listCampaigns(params);

  const previousPage = Math.max(1, campaigns.pagination.page - 1);
  const nextPage = Math.min(campaigns.pagination.totalPages, campaigns.pagination.page + 1);
  const totalSpendCrc = campaigns.items.reduce((sum, campaign) => sum + campaign.totalSpendCrc, 0);
  const totalRevenueCrc = campaigns.items.reduce((sum, campaign) => sum + campaign.revenueCrc, 0);
  const totalOrders = campaigns.items.reduce((sum, campaign) => sum + campaign.orders, 0);
  const totalLeads = campaigns.items.reduce((sum, campaign) => sum + campaign.leads, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <PageHeader
          title="Campaigns"
          description="Módulo comercial de campañas con gasto, leads, órdenes e ingresos atribuidos desde servicios con agregación controlada."
        />
        <div className="rounded-2xl border border-border/70 bg-white/80 px-4 py-3 text-sm text-muted-foreground">
          {campaigns.pagination.total} campañas encontradas
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Spend visible
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {formatCurrencyCRC(totalSpendCrc)}
          </p>
        </article>
        <article className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Leads visibles
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {totalLeads.toLocaleString("es-CR")}
          </p>
        </article>
        <article className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Orders visibles
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {totalOrders.toLocaleString("es-CR")}
          </p>
        </article>
        <article className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Revenue visible
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {formatCurrencyCRC(totalRevenueCrc)}
          </p>
        </article>
      </section>

      <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <form
          className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]"
          method="get"
        >
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Search
            </span>
            <input
              defaultValue={params.search ?? ""}
              name="search"
              placeholder="Nombre, plataforma u objetivo"
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary"
            />
          </label>

          <input type="hidden" name="page" value="1" />

          <div className="flex flex-wrap gap-3 md:items-end">
            <Button type="submit">Aplicar filtros</Button>
            <Button asChild variant="outline">
              <Link href="/campaigns">Limpiar</Link>
            </Button>
          </div>
        </form>
      </section>

      <CampaignsTable campaigns={campaigns.items} />

      <section className="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Página {campaigns.pagination.page} de {campaigns.pagination.totalPages}
        </div>
        <div className="flex flex-wrap gap-3">
          <PaginationButton
            disabled={campaigns.pagination.page <= 1}
            href={buildCampaignsHref({
              ...params,
              page: previousPage,
            })}
            label="Anterior"
          />
          <PaginationButton
            disabled={campaigns.pagination.page >= campaigns.pagination.totalPages}
            href={buildCampaignsHref({
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

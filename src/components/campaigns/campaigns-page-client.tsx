"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { CampaignAlertsCard } from "@/components/campaigns/campaign-alerts-card";
import { CampaignEfficiencyCard } from "@/components/campaigns/campaign-efficiency-card";
import { CampaignLeadQualityCard } from "@/components/campaigns/campaign-lead-quality-card";
import { CampaignsTable } from "@/components/campaigns/campaigns-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/page-loading";
import { StateDisplay } from "@/components/ui/state-display";
import { useCampaigns } from "@/hooks/use-campaigns";
import { formatCurrencyCRC } from "@/lib/formatters";
import type { ListCampaignsParams } from "@/server/services/campaigns";

function parsePositiveInteger(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : undefined;
}

function toListParams(searchParams: URLSearchParams): ListCampaignsParams {
  const rawSearch = searchParams.get("search")?.trim();

  return {
    page: parsePositiveInteger(searchParams.get("page")) ?? 1,
    pageSize: 12,
    search: rawSearch ? rawSearch : undefined,
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

export function CampaignsPageClient() {
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const params = toListParams(new URLSearchParams(searchParamsKey));
  const { data, isLoading, isError, error } = useCampaigns(params);

  if (isLoading && !data) {
    return <PageLoading summaryCards={4} tables={2} />;
  }

  if (isError || !data) {
    return (
      <StateDisplay
        tone="error"
        title="No pudimos cargar las campanas"
        description={error?.message ?? "Ocurrio un error controlado al consultar este modulo."}
      />
    );
  }

  const previousPage = Math.max(1, data.pagination.page - 1);
  const nextPage = Math.min(data.pagination.totalPages, data.pagination.page + 1);
  const topCards = [
    {
      label: "Spend",
      value: formatCurrencyCRC(data.overview.totalSpendCrc),
    },
    {
      label: "Leads",
      value: data.overview.attributedLeads.toLocaleString("es-CR"),
    },
    {
      label: "Orders",
      value: data.overview.attributedOrders.toLocaleString("es-CR"),
    },
    {
      label: "Revenue",
      value: formatCurrencyCRC(data.overview.attributedRevenueCrc),
    },
    {
      label: "ROAS",
      value: `${data.overview.roas.toFixed(2)}x`,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <PageHeader
          title="Campaigns"
          description="Vista agregada de adquisición, revenue y calidad comercial para identificar qué campañas realmente traen negocio."
        />
        <div className="rounded-2xl border border-border/70 bg-white/80 px-4 py-3 text-sm text-muted-foreground">
          {data.overview.totalCampaigns} campanas encontradas
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {topCards.map((card) => (
          <article
            key={card.label}
            className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{card.value}</p>
            <p className="mt-2 text-sm text-muted-foreground">Resultado global del filtro actual</p>
          </article>
        ))}
      </section>

      <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <form
          key={searchParamsKey}
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

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)_minmax(320px,1fr)]">
        <CampaignLeadQualityCard overview={data.overview} />
        <CampaignEfficiencyCard overview={data.overview} />
        <CampaignAlertsCard overview={data.overview} />
      </section>

      <CampaignsTable campaigns={data.items} params={params} />

      <section className="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Pagina {data.pagination.page} de {data.pagination.totalPages}
        </div>
        <div className="flex flex-wrap gap-3">
          <PaginationButton
            disabled={data.pagination.page <= 1}
            href={buildCampaignsHref({
              ...params,
              page: previousPage,
            })}
            label="Anterior"
          />
          <PaginationButton
            disabled={data.pagination.page >= data.pagination.totalPages}
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

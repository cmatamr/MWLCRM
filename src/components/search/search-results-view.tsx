import type { ReactNode } from "react";
import Link from "next/link";
import { Megaphone, PackageSearch, Search, UsersRound } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { StateDisplay } from "@/components/ui/state-display";
import { formatCurrencyCRC, formatDate, formatDateTime } from "@/lib/formatters";
import { toSafeLinkHref } from "@/lib/security/url";
import type {
  CampaignSearchResult,
  CustomerSearchResult,
  GlobalSearchResults,
  OrderSearchResult,
} from "@/server/services/search";

type SearchResultsViewProps = {
  results: GlobalSearchResults;
};

type SearchSectionProps = {
  title: string;
  description: string;
  emptyMessage: string;
  count: number;
  children: ReactNode;
};

function SearchSection({
  title,
  description,
  emptyMessage,
  count,
  children,
}: SearchSectionProps) {
  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
          {count.toLocaleString("es-CR")} resultados
        </p>
        <div className="space-y-1">
          <h3 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h3>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>

      {count > 0 ? (
        <div className="mt-6 space-y-3">{children}</div>
      ) : (
        <div className="mt-6">
          <StateDisplay
            title={`Sin resultados en ${title.toLowerCase()}`}
            description={emptyMessage}
            className="border-dashed border-border bg-slate-50/70 shadow-none"
            compact
          />
        </div>
      )}
    </section>
  );
}

function CustomerResultCard({ customer }: { customer: CustomerSearchResult }) {
  return (
    <Link
      href={toSafeLinkHref(customer.href, "/customers")}
      className="block rounded-[24px] border border-border/70 bg-slate-50/70 p-5 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
            <UsersRound className="h-4 w-4" aria-hidden="true" />
            Cliente
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold tracking-tight text-slate-950">
              {customer.displayName ?? "Cliente sin nombre"}
            </p>
            <p className="text-sm text-muted-foreground">
              ID externo: {customer.externalId} · Canal: {customer.primaryChannel.toUpperCase()}
            </p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground md:text-right">
          <p>{customer.totalOrders.toLocaleString("es-CR")} órdenes</p>
          <p>{formatCurrencyCRC(customer.totalSpentCrc)}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Estado: {customer.customerStatus ?? "Sin estado"} · Última orden:{" "}
        {customer.lastOrderAt ? formatDateTime(customer.lastOrderAt) : "Sin compras"}
      </p>
    </Link>
  );
}

function OrderResultCard({ order }: { order: OrderSearchResult }) {
  return (
    <Link
      href={toSafeLinkHref(order.href, "/orders")}
      className="block rounded-[24px] border border-border/70 bg-slate-50/70 p-5 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
            <PackageSearch className="h-4 w-4" aria-hidden="true" />
            Orden
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold tracking-tight text-slate-950">{order.id}</p>
            <p className="text-sm text-muted-foreground">
              Cliente: {order.customer.name ?? "Cliente no identificado"}
              {order.customer.externalId ? ` · ${order.customer.externalId}` : ""}
            </p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground md:text-right">
          <p className="font-medium text-slate-900">{formatCurrencyCRC(order.totalCrc)}</p>
          <p>{formatDateTime(order.createdAt)}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Estado: {order.status} · Pago: {order.paymentStatus}
      </p>
    </Link>
  );
}

function CampaignResultCard({ campaign }: { campaign: CampaignSearchResult }) {
  return (
    <Link
      href={toSafeLinkHref(campaign.href, "/campaigns")}
      className="block rounded-[24px] border border-border/70 bg-slate-50/70 p-5 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
            <Megaphone className="h-4 w-4" aria-hidden="true" />
            Campaña
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold tracking-tight text-slate-950">{campaign.name}</p>
            <p className="text-sm text-muted-foreground">
              {campaign.platform ?? "Plataforma no definida"}
              {campaign.objective ? ` · ${campaign.objective}` : ""}
            </p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground md:text-right">
          <p>{campaign.startDate ? formatDate(campaign.startDate) : "Sin fecha de inicio"}</p>
          <p>{campaign.endDate ? formatDate(campaign.endDate) : "Sin fecha de cierre"}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">ID: {campaign.id}</p>
    </Link>
  );
}

export function SearchResultsView({ results }: SearchResultsViewProps) {
  if (!results.query) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Búsqueda global"
          description="Busca clientes, órdenes y campañas desde el header del CRM usando texto libre y navegación directa a cada detalle."
        />
        <StateDisplay
          eyebrow="Search"
          icon={Search}
          title="Escribe algo para empezar"
          description="Ingresa un nombre, un identificador externo o un id de orden/campaña desde el buscador superior y presiona Enter para ver resultados reales."
        />
      </div>
    );
  }

  if (results.totalResults === 0) {
    return (
      <div className="space-y-8">
        <PageHeader
          title={`Resultados para “${results.query}”`}
          description="La búsqueda global consulta clientes, órdenes y campañas usando la capa de datos real del CRM."
        />
        <StateDisplay
          eyebrow="Search"
          title="No encontramos coincidencias"
          description="Prueba con menos palabras, revisa espacios extra o intenta buscar por nombre, id externo o id técnico según la entidad."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Resultados para “${results.query}”`}
        description={`Encontramos ${results.totalResults.toLocaleString("es-CR")} coincidencias iniciales agrupadas por entidad. Cada resultado abre su detalle real en el CRM.`}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SearchSection
          title="Clientes"
          description="Coincidencias por nombre o identificador externo del contacto."
          emptyMessage="No hubo coincidencias de clientes para esta consulta."
          count={results.customers.length}
        >
          {results.customers.map((customer) => (
            <CustomerResultCard key={customer.id} customer={customer} />
          ))}
        </SearchSection>

        <SearchSection
          title="Órdenes"
          description="Coincidencias por id técnico de orden o por el cliente asociado."
          emptyMessage="No hubo coincidencias de órdenes para esta consulta."
          count={results.orders.length}
        >
          {results.orders.map((order) => (
            <OrderResultCard key={order.id} order={order} />
          ))}
        </SearchSection>
      </div>

      <SearchSection
        title="Campañas"
        description="Coincidencias por nombre, id técnico, plataforma u objetivo."
        emptyMessage="No hubo coincidencias de campañas para esta consulta."
        count={results.campaigns.length}
      >
        {results.campaigns.map((campaign) => (
          <CampaignResultCard key={campaign.id} campaign={campaign} />
        ))}
      </SearchSection>
    </div>
  );
}

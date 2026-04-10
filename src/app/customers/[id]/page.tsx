import Link from "next/link";
import { notFound } from "next/navigation";

import { CustomerConversationSummary } from "@/components/customers/customer-conversation-summary";
import { CustomerHeaderCard } from "@/components/customers/customer-header-card";
import { CustomerOrderList } from "@/components/customers/customer-order-list";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { formatCurrencyCRC, formatDateTime } from "@/lib/formatters";
import { getCustomerDetail } from "@/server/services/customers";

export const dynamic = "force-dynamic";

type CustomerDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function buildSummaryItems(customer: NonNullable<Awaited<ReturnType<typeof getCustomerDetail>>>) {
  const averageTicket =
    customer.metrics.totalOrders > 0
      ? customer.metrics.totalSpentCrc / customer.metrics.totalOrders
      : 0;

  return [
    {
      label: "Total de órdenes",
      value: String(customer.metrics.totalOrders),
      hint: "Cantidad histórica registrada",
    },
    {
      label: "Total Compras",
      value: formatCurrencyCRC(customer.metrics.totalSpentCrc),
      hint: "Revenue acumulado del customer",
    },
    {
      label: "Última orden",
      value: customer.metrics.lastOrderAt ? formatDateTime(customer.metrics.lastOrderAt) : "Sin compras",
      hint: "Recencia comercial",
    },
    {
      label: "Ticket promedio",
      value: formatCurrencyCRC(averageTicket),
      hint: "Promedio por orden",
    },
  ];
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params;
  const customer = await getCustomerDetail(id);

  if (!customer) {
    notFound();
  }

  const summaryItems = buildSummaryItems(customer);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <PageHeader
          title="Customer Detail"
          description="Ficha comercial unificada con datos base, señales de compra, órdenes y conversación relacionada."
        />
        <Button asChild variant="outline">
          <Link href="/customers">Volver al listado</Link>
        </Button>
      </div>

      <CustomerHeaderCard customer={customer} />

      <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)]">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
            Commercial summary
          </p>
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Resumen comercial
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Métricas rápidas para decidir prioridad, recurrencia y valor del cliente.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryItems.map((item) => (
            <article
              key={item.label}
              className="rounded-[24px] border border-border/70 bg-slate-50/70 p-4 text-center"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {item.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{item.hint}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)]">
        <CustomerOrderList orders={customer.orders} />
        <CustomerConversationSummary conversations={customer.conversations} />
      </div>
    </div>
  );
}

import Link from "next/link";

import { formatLeadStageLabel } from "@/domain/crm/formatters";
import { formatCalendarDate, formatCurrencyCRC, formatDateTime } from "@/lib/formatters";
import type { OrderDetail } from "@/server/services/orders/types";
import { StatusBadge, StatusBadgeFromViewModel } from "@/components/ui/status-badge";

import {
  formatCustomerName,
  formatOrderShortId,
  getOrderStatusBadge,
  getPaymentStatusBadge,
} from "./order-presenters";

type OrderSummaryCardProps = {
  order: OrderDetail;
};

export function OrderSummaryCard({ order }: OrderSummaryCardProps) {
  const orderStatusBadge = getOrderStatusBadge(order.status);
  const paymentStatusBadge = getPaymentStatusBadge(order.paymentStatus);
  const summaryItems = [
    {
      label: "Total CRC",
      value: formatCurrencyCRC(order.totalCrc),
      hint: "Monto total vigente de la orden",
      className: "xl:col-start-2 xl:row-start-1",
    },
    {
      label: "Subtotal CRC",
      value: formatCurrencyCRC(order.subtotalCrc),
      hint: "Base previa a ajustes futuros",
      className: "xl:col-start-3 xl:row-start-1",
    },
    {
      label: "Creada",
      value: formatDateTime(order.createdAt),
      hint: "Momento de registro",
      className: "xl:col-start-2 xl:row-start-2",
    },
    {
      label: "Actualizada",
      value: formatDateTime(order.updatedAt),
      hint: "Último cambio persistido",
      className: "xl:col-start-3 xl:row-start-2",
    },
    {
      label: "Entrega",
      value: order.deliveryDate ? formatCalendarDate(order.deliveryDate) : "Sin fecha",
      hint: "Fecha general de entrega de la orden",
      className: "xl:col-start-2 xl:row-start-3",
    },
    {
      label: "Lead thread",
      value: order.conversation.leadThreadKey,
      hint: `Stage: ${formatLeadStageLabel(order.conversation.leadStage)}`,
      meta: `Thread ID: ${order.conversation.id}`,
      className: "xl:col-start-3 xl:row-start-3",
    },
  ];
  const customerCard = (
    <article className="rounded-[24px] border border-border/70 bg-white/85 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Cliente
      </p>
      <p className="mt-2 text-lg font-semibold text-slate-950">
        {formatCustomerName(order.customer.name)}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        External ID: {order.customer.externalId ?? "No disponible"}
      </p>
      {order.customer.id ? (
        <Link
          href={`/customers/${order.customer.id}`}
          className="mt-3 inline-flex text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          Ver customer
        </Link>
      ) : null}
    </article>
  );

  return (
    <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-panel">
      <div className="bg-hero-grid p-6 md:p-8">
        <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,200px)_minmax(0,200px)] xl:grid-rows-[auto_auto_auto] xl:items-stretch xl:gap-x-5 xl:gap-y-3">
          <div className="space-y-4 xl:col-start-1 xl:row-span-2 xl:min-w-0">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
                  Order overview
                </p>
                <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-950">
                  {formatOrderShortId(order.id)}
                </h1>
                <p className="text-sm text-slate-600">
                  Source: {order.source} · Legacy status: {order.statusLegacy}
                </p>
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Order ID: {order.id}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <StatusBadgeFromViewModel badge={orderStatusBadge} />
                <StatusBadge tone={paymentStatusBadge.tone}>
                  Pago: {paymentStatusBadge.label}
                </StatusBadge>
                <StatusBadge>
                  Moneda: {order.currency}
                </StatusBadge>
              </div>
            </div>
          </div>

          <div className="xl:col-start-1 xl:row-start-3 xl:self-stretch">
            {customerCard}
          </div>

          {summaryItems.map((item) => (
            <article
              key={item.label}
              className={`rounded-[24px] border border-border/70 bg-white/85 px-4 py-3 ${item.className}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-950">{item.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
              {"meta" in item ? (
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  {item.meta}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

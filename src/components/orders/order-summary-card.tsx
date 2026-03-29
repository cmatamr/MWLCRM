import Link from "next/link";

import { formatLeadStageLabel } from "@/domain/crm/formatters";
import { formatCurrencyCRC, formatDateTime } from "@/lib/formatters";
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
    },
    {
      label: "Subtotal CRC",
      value: formatCurrencyCRC(order.subtotalCrc),
      hint: "Base previa a ajustes futuros",
    },
    {
      label: "Creada",
      value: formatDateTime(order.createdAt),
      hint: "Momento de registro",
    },
    {
      label: "Actualizada",
      value: formatDateTime(order.updatedAt),
      hint: "Último cambio persistido",
    },
  ];

  return (
    <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-panel">
      <div className="bg-hero-grid p-6 md:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
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

          <div className="grid gap-3 sm:grid-cols-2">
            {summaryItems.map((item) => (
              <article
                key={item.label}
                className="rounded-[24px] border border-border/70 bg-white/85 px-4 py-3"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-950">{item.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
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

          <article className="rounded-[24px] border border-border/70 bg-white/85 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Lead thread
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{order.conversation.leadThreadKey}</p>
            <div className="mt-2">
              <StatusBadge tone="info">
                Stage: {formatLeadStageLabel(order.conversation.leadStage)}
              </StatusBadge>
            </div>
            <p className="mt-3 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Thread ID: {order.conversation.id}
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

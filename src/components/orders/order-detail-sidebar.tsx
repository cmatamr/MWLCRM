import Link from "next/link";

import { formatLeadStageLabel } from "@/domain/crm/formatters";
import { formatCalendarDate, formatCurrencyCRC, formatDateTime } from "@/lib/formatters";
import type { OrderDetail } from "@/server/services/orders/types";
import { Button } from "@/components/ui/button";
import { StatusBadge, StatusBadgeFromViewModel } from "@/components/ui/status-badge";

import {
  formatCustomerName,
  getOrderStatusBadge,
  getPaymentStatusBadge,
} from "./order-presenters";
import { OrderPaymentActions } from "./order-payment-actions";

type OrderDetailSidebarProps = {
  order: OrderDetail;
};

export function OrderActionCenterCard({ order }: OrderDetailSidebarProps) {
  const orderStatusBadge = getOrderStatusBadge(order.status);
  const paymentStatusBadge = getPaymentStatusBadge(order.paymentStatus);

  return (
    <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] xl:min-h-[320px]">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
          Action center
        </p>
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Operación de la orden
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Estado comercial, validación de pago y accesos rápidos del cliente.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <StatusBadgeFromViewModel badge={orderStatusBadge} />
        <StatusBadge tone={paymentStatusBadge.tone}>
          Pago: {paymentStatusBadge.label}
        </StatusBadge>
      </div>

      <div className="mt-6 rounded-[24px] border border-border/70 bg-slate-50/70 p-4">
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
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href={`/customers/${order.customer.id}`}>Ver customer</Link>
          </Button>
        ) : null}
      </div>

      <div className="mt-4 rounded-[24px] border border-border/70 bg-slate-50/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Hilo comercial
        </p>
        <p className="mt-2 break-all text-sm font-medium text-slate-950">
          {order.conversation.leadThreadKey}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge tone="info">
            Stage: {formatLeadStageLabel(order.conversation.leadStage)}
          </StatusBadge>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Thread ID: {order.conversation.id}
        </p>
      </div>

      <div className="mt-6 border-t border-border/70 pt-6">
        <OrderPaymentActions
          orderId={order.id}
          orderStatus={order.status}
          paymentStatus={order.paymentStatus}
        />
      </div>
    </section>
  );
}

export function OrderPaymentSummaryCard({ order }: OrderDetailSidebarProps) {
  const latestReceipt = order.receipts[0] ?? null;

  return (
    <section className="flex h-full flex-col rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
          Payment
        </p>
        <h3 className="text-xl font-semibold tracking-tight text-slate-950">
          Comprobantes
        </h3>
      </div>

      {latestReceipt ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-[24px] border border-border/70 bg-slate-50/70 p-4">
            <StatusBadgeFromViewModel badge={getPaymentStatusBadge(latestReceipt.status)} />
            <p className="mt-3 text-lg font-semibold text-slate-950">
              {latestReceipt.amountCrc != null
                ? formatCurrencyCRC(latestReceipt.amountCrc)
                : "Monto no disponible"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {latestReceipt.bank ?? "Banco no detectado"} · {latestReceipt.transferType ?? "Tipo no detectado"}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              {latestReceipt.receiptDate
                ? `Fecha del comprobante: ${formatCalendarDate(latestReceipt.receiptDate)}`
                : "Sin fecha detectada"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Registrado: {formatDateTime(latestReceipt.createdAt)}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-border/70 bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Adelanto validado
              </p>
              <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                {formatCurrencyCRC(order.advancePaidCrc)}
              </p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Pendiente de validacion
              </p>
              <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                {formatCurrencyCRC(order.pendingValidationCrc)}
              </p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Comprobantes
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                {order.receipts.length}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">registrados en la orden.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-[24px] border border-dashed border-border bg-slate-50/70 p-4 xl:min-h-[128px]">
          <p className="text-sm font-medium text-slate-950">
            No hay comprobantes asociados
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cuando se registren transferencias o recibos de pago aparecerán aquí como resumen rápido.
          </p>
        </div>
      )}
    </section>
  );
}

export function OrderDetailSidebar({ order }: OrderDetailSidebarProps) {
  return (
    <aside className="space-y-6">
      <OrderActionCenterCard order={order} />
      <OrderPaymentSummaryCard order={order} />
    </aside>
  );
}

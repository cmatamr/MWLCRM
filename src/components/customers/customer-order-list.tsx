import type { CustomerOrderSummary } from "@/server/services/customers/types";
import { InlineStateDisplay } from "@/components/ui/state-display";
import { StatusBadgeFromViewModel } from "@/components/ui/status-badge";
import { formatCurrencyCRC, formatDateTime } from "@/lib/formatters";

import { getOrderStatusBadge } from "./customer-presenters";

type CustomerOrderListProps = {
  orders: CustomerOrderSummary[];
};

export function CustomerOrderList({ orders }: CustomerOrderListProps) {
  return (
    <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
          Orders
        </p>
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Órdenes del cliente
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Historial reciente para validar recurrencia, ticket y estado comercial.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {orders.length > 0 ? (
          orders.map((order) => {
            const orderBadge = getOrderStatusBadge(order.status);

            return (
            <article
              key={order.id}
              className="rounded-[24px] border border-border/70 bg-slate-50/70 p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-950">#{order.id.slice(0, 8)}</p>
                  <p className="text-sm text-muted-foreground">
                    Creada: {formatDateTime(order.createdAt)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadgeFromViewModel badge={orderBadge} />
                  <span className="text-sm font-semibold text-slate-950">
                    {formatCurrencyCRC(order.totalCrc)}
                  </span>
                </div>
              </div>
            </article>
          );
          })
        ) : (
          <InlineStateDisplay
            title="Este cliente todavía no tiene órdenes"
            description="Cuando se cree una compra para este customer, aparecerá aquí su historial comercial."
            className="border-dashed border-border bg-slate-50/70 shadow-none"
          />
        )}
      </div>
    </section>
  );
}

import { formatCurrencyCRC } from "@/lib/formatters";
import type { OrderDetail } from "@/server/services/orders/types";

type OrderTotalsCardProps = {
  order: OrderDetail;
};

export function OrderTotalsCard({ order }: OrderTotalsCardProps) {
  const discount = order.subtotalCrc - order.totalCrc;

  return (
    <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
            Financial summary
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Resumen financiero
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Snapshot contable actual de la orden en CRC.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-[24px] border border-border/70 bg-slate-50/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Subtotal
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {formatCurrencyCRC(order.subtotalCrc)}
          </p>
        </article>

        <article className="rounded-[24px] border border-border/70 bg-slate-50/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Ajuste neto
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {discount === 0 ? "Sin ajuste" : formatCurrencyCRC(discount)}
          </p>
        </article>

        <article className="rounded-[24px] border border-primary/15 bg-primary/[0.07] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/70">
            Gran total
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {formatCurrencyCRC(order.totalCrc)}
          </p>
        </article>
      </div>
    </section>
  );
}

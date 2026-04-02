import { formatCurrencyCRC } from "@/lib/formatters";
import type { OrderDetail } from "@/server/services/orders/types";

type OrderTotalsCardProps = {
  order: OrderDetail;
};

function formatNegativeCurrency(value: number) {
  return `-${formatCurrencyCRC(Math.abs(value))}`;
}

export function OrderTotalsCard({ order }: OrderTotalsCardProps) {
  const discount = order.subtotalCrc - order.totalCrc;
  const iva = 0;
  const advance = order.advancePaidCrc;
  const pendingValidation = order.pendingValidationCrc;
  const pendingAmount = Math.max(order.totalCrc - advance, 0);
  const detailRows = [
    {
      label: "Subtotal",
      value: formatCurrencyCRC(order.subtotalCrc),
      tone: "default" as const,
    },
    {
      label: "Descuento",
      value: formatNegativeCurrency(discount),
      tone: "muted" as const,
    },
    {
      label: "IVA (13%)",
      value: formatCurrencyCRC(iva),
      tone: "default" as const,
    },
    {
      label: "Adelanto",
      value: formatNegativeCurrency(advance),
      tone: "muted" as const,
    },
    {
      label: "Pendiente de validacion",
      value: formatNegativeCurrency(pendingValidation),
      tone: "muted" as const,
    },
    {
      label: "Monto pendiente",
      value: formatCurrencyCRC(pendingAmount),
      tone: "emphasis" as const,
    },
  ];

  return (
    <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] xl:min-h-[260px]">
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

      <div className="mt-6 overflow-hidden rounded-[28px] border border-border/70 bg-slate-50/60">
        <div className="border-b border-primary/10 bg-primary/[0.07] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
                Total
              </p>
              <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                Total de la orden
              </h3>
            </div>
            <p className="text-right text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {formatCurrencyCRC(order.totalCrc)}
            </p>
          </div>
        </div>

        <div className="bg-white/80">
          {detailRows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-4 last:border-b-0 sm:px-6"
            >
              <p
                className={
                  row.tone === "emphasis"
                    ? "text-sm font-semibold text-slate-950"
                    : "text-sm font-medium text-slate-700"
                }
              >
                {row.label}
              </p>
              <p
                className={
                  row.tone === "emphasis"
                    ? "rounded-full border border-primary/15 bg-primary/[0.08] px-3 py-1 text-base font-semibold text-slate-950"
                    : row.tone === "muted"
                      ? "text-sm font-semibold text-slate-950"
                      : "text-sm font-medium text-slate-950"
                }
              >
                {row.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

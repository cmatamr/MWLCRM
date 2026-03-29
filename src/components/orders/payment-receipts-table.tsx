import { formatDateTime } from "@/lib/formatters";
import type { OrderReceiptSummary } from "@/server/services/orders/types";
import { TableEmptyStateRow } from "@/components/ui/state-display";
import { StatusBadgeFromViewModel } from "@/components/ui/status-badge";

import { getPaymentStatusBadge } from "./order-presenters";

type PaymentReceiptsTableProps = {
  receipts: OrderReceiptSummary[];
};

export function PaymentReceiptsTable({ receipts }: PaymentReceiptsTableProps) {
  return (
    <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
          Payment receipts
        </p>
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Comprobantes de pago
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Validación operativa de transferencias asociadas a la orden.
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-[24px] border border-border/70">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border/70 text-left">
            <caption className="sr-only">
              Comprobantes de pago asociados a la orden y su estado de validación.
            </caption>
            <thead className="bg-muted/40 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Estado</th>
                <th scope="col" className="px-4 py-3 font-medium">Monto</th>
                <th scope="col" className="px-4 py-3 font-medium">Banco</th>
                <th scope="col" className="px-4 py-3 font-medium">Referencia</th>
                <th scope="col" className="px-4 py-3 font-medium">Remitente</th>
                <th scope="col" className="px-4 py-3 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-white">
              {receipts.length > 0 ? (
                receipts.map((receipt) => {
                  const receiptStatusBadge = getPaymentStatusBadge(receipt.status);

                  return (
                    <tr key={receipt.id} className="align-top text-sm text-slate-700">
                      <td className="px-4 py-4">
                        <StatusBadgeFromViewModel badge={receiptStatusBadge} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="font-medium text-slate-950">
                            {receipt.amountText?.trim() || "Monto no detectado"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {receipt.currency ?? "Moneda no detectada"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p>{receipt.bank ?? "Banco no detectado"}</p>
                          <p className="text-xs text-muted-foreground">
                            {receipt.transferType ?? "Tipo no detectado"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">{receipt.reference ?? "Sin referencia"}</td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p>{receipt.senderName ?? "Remitente no detectado"}</p>
                          <p className="text-xs text-muted-foreground">
                            {receipt.destinationPhone ?? receipt.recipientName ?? "Sin destino detectado"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p>{receipt.receiptDate ? formatDateTime(receipt.receiptDate) : "Sin fecha"}</p>
                          <p className="text-xs text-muted-foreground">
                            Registrado: {formatDateTime(receipt.createdAt)}
                          </p>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <TableEmptyStateRow
                  colSpan={6}
                  title="No hay comprobantes asociados"
                  description="Cuando se registren transferencias o recibos de pago, esta tabla mostrará su validación."
                />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

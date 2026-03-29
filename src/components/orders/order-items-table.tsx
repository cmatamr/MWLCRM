import { formatCurrencyCRC, formatDateTime } from "@/lib/formatters";
import type { OrderItemSummary } from "@/server/services/orders/types";
import { TableEmptyStateRow } from "@/components/ui/state-display";

type OrderItemsTableProps = {
  items: OrderItemSummary[];
};

export function OrderItemsTable({ items }: OrderItemsTableProps) {
  return (
    <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
          Order items
        </p>
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Items de la orden
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Desglose preparado para futura edición de cantidades, precios y atributos.
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-[24px] border border-border/70">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border/70 text-left">
            <caption className="sr-only">
              Items registrados dentro de la orden, con cantidades, precios y contexto del evento.
            </caption>
            <thead className="bg-muted/40 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Producto</th>
                <th scope="col" className="px-4 py-3 font-medium">SKU</th>
                <th scope="col" className="px-4 py-3 font-medium">Cantidad</th>
                <th scope="col" className="px-4 py-3 font-medium">Precio unitario</th>
                <th scope="col" className="px-4 py-3 font-medium">Total</th>
                <th scope="col" className="px-4 py-3 font-medium">Tema / fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-white">
              {items.length > 0 ? (
                items.map((item) => (
                  <tr key={item.id} className="align-top text-sm text-slate-700">
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <p className="font-medium text-slate-950">
                          {item.productName?.trim() || "Producto sin snapshot"}
                        </p>
                        {item.notes ? (
                          <p className="max-w-sm text-xs leading-5 text-muted-foreground">
                            {item.notes}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-4">{item.sku ?? "Sin SKU"}</td>
                    <td className="px-4 py-4 font-medium text-slate-950">{item.quantity}</td>
                    <td className="px-4 py-4">
                      {item.unitPriceCrc != null ? formatCurrencyCRC(item.unitPriceCrc) : "Pendiente"}
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-950">
                      {item.totalPriceCrc != null ? formatCurrencyCRC(item.totalPriceCrc) : "Pendiente"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <p>{item.theme ?? "Sin tema"}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.eventDate ? formatDateTime(item.eventDate) : "Sin fecha de evento"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <TableEmptyStateRow
                  colSpan={6}
                  title="Esta orden no tiene items todavía"
                  description="Cuando se registren productos, cantidades y precios aparecerán aquí para revisión operativa."
                />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

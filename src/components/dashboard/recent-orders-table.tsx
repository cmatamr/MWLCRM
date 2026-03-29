import type { DashboardRecentOrder } from "@/server/services/dashboard/types";
import { StatusBadgeFromViewModel } from "@/components/ui/status-badge";
import { TableEmptyStateRow } from "@/components/ui/state-display";
import { formatCurrencyCRC, formatDateTime } from "@/lib/formatters";
import { getOrderStatusBadge, getPaymentStatusBadge } from "@/components/orders/order-presenters";

type RecentOrdersTableProps = {
  orders: DashboardRecentOrder[];
};

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
            Orders
          </p>
          <div className="space-y-1">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
              Órdenes recientes
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Últimos pedidos creados para seguir monto, cliente y estado operativo.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-[24px] border border-border/70">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border/70 text-left">
            <caption className="sr-only">
              Órdenes recientes con cliente, monto, estado y condición de pago.
            </caption>
            <thead className="bg-muted/40 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Orden</th>
                <th scope="col" className="px-4 py-3 font-medium">Cliente</th>
                <th scope="col" className="px-4 py-3 font-medium">Monto</th>
                <th scope="col" className="px-4 py-3 font-medium">Estado</th>
                <th scope="col" className="px-4 py-3 font-medium">Pago</th>
                <th scope="col" className="px-4 py-3 font-medium">Creada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-white">
              {orders.length > 0 ? (
                orders.map((order) => {
                  const orderBadge = getOrderStatusBadge(order.status);
                  const paymentBadge = getPaymentStatusBadge(order.paymentStatus);

                  return (
                  <tr key={order.id} className="text-sm text-slate-700">
                    <td className="px-4 py-4 font-medium text-slate-950">
                      #{order.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-4">{order.customer.name ?? "Cliente sin nombre"}</td>
                    <td className="px-4 py-4 font-medium text-slate-950">
                      {formatCurrencyCRC(order.totalCrc)}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadgeFromViewModel badge={orderBadge} />
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadgeFromViewModel badge={paymentBadge} />
                    </td>
                    <td className="px-4 py-4">{formatDateTime(order.createdAt)}</td>
                  </tr>
                );
                })
              ) : (
                <TableEmptyStateRow
                  colSpan={6}
                  title="Todavía no hay órdenes recientes"
                  description="Cuando entren nuevas órdenes al CRM, este resumen mostrará las más recientes."
                />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

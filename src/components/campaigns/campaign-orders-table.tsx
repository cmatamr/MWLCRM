import Link from "next/link";

import { StatusBadgeFromViewModel } from "@/components/ui/status-badge";
import { TableEmptyStateRow } from "@/components/ui/state-display";
import { formatCurrencyCRC, formatDateTime } from "@/lib/formatters";
import type { CampaignAttributedOrder } from "@/server/services/campaigns";
import {
  formatCustomerName,
  formatOrderShortId,
  getOrderStatusBadge,
  getPaymentStatusBadge,
} from "@/components/orders/order-presenters";

type CampaignOrdersTableProps = {
  orders: CampaignAttributedOrder[];
};

export function CampaignOrdersTable({ orders }: CampaignOrdersTableProps) {
  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)]">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
          Orders
        </p>
        <div className="space-y-1">
          <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
            Órdenes atribuidas
          </h3>
          <p className="text-sm leading-6 text-muted-foreground">
            Detalle de órdenes únicas conectadas a los leads atribuidos de la campaña.
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-[24px] border border-border/70">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border/70 text-left">
            <caption className="sr-only">
              Órdenes atribuidas a la campaña con estado comercial y de pago.
            </caption>
            <thead className="bg-muted/40 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">ID</th>
                <th scope="col" className="px-4 py-3 font-medium">Customer</th>
                <th scope="col" className="px-4 py-3 font-medium">Conversation</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium">Payment</th>
                <th scope="col" className="px-4 py-3 font-medium">Total CRC</th>
                <th scope="col" className="px-4 py-3 font-medium">Created at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-white">
              {orders.length > 0 ? (
                orders.map((order) => {
                  const orderBadge = getOrderStatusBadge(order.status);
                  const paymentBadge = getPaymentStatusBadge(order.paymentStatus);

                  return (
                  <tr key={order.id} className="text-sm text-slate-700">
                    <td className="px-4 py-4">
                      <Link
                        href={`/orders/${order.id}`}
                        className="font-medium text-slate-950 transition-colors hover:text-primary"
                      >
                        {formatOrderShortId(order.id)}
                      </Link>
                    </td>
                    <td className="px-4 py-4">{formatCustomerName(order.customer.name)}</td>
                    <td className="px-4 py-4 font-medium text-slate-950">
                      {order.conversation.leadThreadKey}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadgeFromViewModel badge={orderBadge} />
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadgeFromViewModel badge={paymentBadge} />
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-950">
                      {formatCurrencyCRC(order.totalCrc)}
                    </td>
                    <td className="px-4 py-4">{formatDateTime(order.createdAt)}</td>
                  </tr>
                );
                })
              ) : (
                <TableEmptyStateRow
                  colSpan={7}
                  title="Esta campaña no tiene órdenes atribuidas"
                  description="Cuando los leads atribuidos generen compras, la tabla mostrará el detalle comercial y de pago."
                />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

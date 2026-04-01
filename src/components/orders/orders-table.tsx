import type { ReactNode } from "react";
import Link from "next/link";

import { formatCurrencyCRC, formatDateTime } from "@/lib/formatters";
import type { OrdersListResponse } from "@/server/services/orders/types";

import {
  formatCustomerName,
  formatOrderShortId,
  getOrderStatusBadge,
  getPaymentStatusBadge,
} from "./order-presenters";
import { StatusBadgeFromViewModel } from "@/components/ui/status-badge";
import { TableEmptyStateRow } from "@/components/ui/state-display";

type OrdersTableProps = {
  orders: OrdersListResponse["items"];
  action?: ReactNode;
};

export function OrdersTable({ orders, action }: OrdersTableProps) {
  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
            Orders
          </p>
          <div className="space-y-1">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
              Operación de órdenes
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Vista transaccional para revisar estado, pago y monto total por orden.
            </p>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className="mt-6 overflow-hidden rounded-[24px] border border-border/70">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border/70 text-left">
            <caption className="sr-only">
              Listado de órdenes con cliente, estado, pago, monto y fecha de creación.
            </caption>
            <thead className="bg-muted/40 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">ID</th>
                <th scope="col" className="px-4 py-3 font-medium">Customer</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium">Payment status</th>
                <th scope="col" className="px-4 py-3 font-medium">Total CRC</th>
                <th scope="col" className="px-4 py-3 font-medium">Created at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-white">
              {orders.length > 0 ? (
                orders.map((order) => {
                  const orderStatusBadge = getOrderStatusBadge(order.status);
                  const paymentStatusBadge = getPaymentStatusBadge(order.paymentStatus);

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
                      <td className="px-4 py-4">
                        <StatusBadgeFromViewModel badge={orderStatusBadge} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadgeFromViewModel badge={paymentStatusBadge} />
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
                  colSpan={6}
                  title="No hay datos disponibles"
                  description="No encontramos órdenes para los filtros actuales. Prueba ajustarlos o espera una nueva sincronización."
                />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";

import type { CustomersListResponse } from "@/server/services/customers/types";
import { formatCurrencyCRC, formatDateTime } from "@/lib/formatters";
import { StatusBadgeFromViewModel } from "@/components/ui/status-badge";
import { TableEmptyStateRow } from "@/components/ui/state-display";

import {
  formatChannelLabel,
  getCustomerDisplayName,
  getCustomerStatusBadge,
} from "./customer-presenters";

type CustomersTableProps = {
  customers: CustomersListResponse["items"];
  action?: ReactNode;
};

export function CustomersTable({ customers, action }: CustomersTableProps) {
  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
            Customers
          </p>
          <div className="space-y-1">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
              Base comercial activa
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Contactos consolidados con señales de compra para seguimiento operativo.
            </p>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className="mt-6 overflow-hidden rounded-[24px] border border-border/70">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border/70 text-center">
            <caption className="sr-only">
              Clientes consolidados con canal principal, gasto total, órdenes y estado comercial.
            </caption>
            <thead className="bg-muted/40 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium text-center">Cliente</th>
                <th scope="col" className="px-4 py-3 font-medium text-center">Canal</th>
                <th scope="col" className="px-4 py-3 font-medium text-center">Órdenes</th>
                <th scope="col" className="px-4 py-3 font-medium text-center">Total Compras</th>
                <th scope="col" className="px-4 py-3 font-medium text-center">Última orden</th>
                <th scope="col" className="px-4 py-3 font-medium text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-white">
              {customers.length > 0 ? (
                customers.map((customer) => {
                  const customerStatusBadge = getCustomerStatusBadge(customer.customerStatus);

                  return (
                  <tr key={customer.id} className="text-sm text-slate-700">
                    <td className="px-4 py-4 text-center">
                      <div className="space-y-1">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="font-medium text-slate-950 transition-colors hover:text-primary"
                        >
                          {getCustomerDisplayName(customer.displayName)}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          ID externo: {customer.externalId}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">{formatChannelLabel(customer.primaryChannel)}</td>
                    <td className="px-4 py-4 text-center font-medium text-slate-950">{customer.totalOrders}</td>
                    <td className="px-4 py-4 text-center font-medium text-slate-950">
                      {formatCurrencyCRC(customer.totalSpentCrc)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {customer.lastOrderAt ? formatDateTime(customer.lastOrderAt) : "Sin compras"}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <StatusBadgeFromViewModel badge={customerStatusBadge} />
                    </td>
                  </tr>
                );
                })
              ) : (
                <TableEmptyStateRow
                  colSpan={6}
                  title="No hay datos disponibles"
                  description="No encontramos clientes para los filtros actuales. Prueba con otro nombre, external ID, canal o estado."
                />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

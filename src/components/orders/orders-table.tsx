"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useState } from "react";
import { Trash2 } from "lucide-react";

import { formatCalendarDate, formatCurrencyCRC, formatDateTime } from "@/lib/formatters";
import type { OrdersListResponse } from "@/server/services/orders/types";
import { useDeleteOrder } from "@/hooks/use-delete-order";
import { Button } from "@/components/ui/button";

import {
  formatCustomerName,
  formatOrderShortId,
  getPaymentStatusBadge,
  getOrderStatusBadge,
} from "./order-presenters";
import { StatusBadgeFromViewModel } from "@/components/ui/status-badge";
import { TableEmptyStateRow } from "@/components/ui/state-display";
import { OrderEditAction } from "./order-edit-action";

type OrdersTableProps = {
  orders: OrdersListResponse["items"];
  action?: ReactNode;
};

function OrderRow({ order }: { order: OrdersListResponse["items"][number] }) {
  const orderStatusBadge = getOrderStatusBadge(order.status);
  const deleteOrderMutation = useDeleteOrder();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  async function handleDelete() {
    setDeleteError(null);

    if (deleteOrderMutation.isPending) {
      return;
    }

    try {
      await deleteOrderMutation.mutateAsync(order.id);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        setDeleteError(error.message);
        return;
      }

      setDeleteError("No se pudo eliminar la orden.");
    }
  }

  function openDeleteDialog() {
    if (deleteOrderMutation.isPending) {
      return;
    }

    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  }

  function closeDeleteDialog() {
    if (deleteOrderMutation.isPending) {
      return;
    }

    setIsDeleteDialogOpen(false);
  }

  return (
    <>
      <tr className="text-sm text-slate-700">
        <td className="px-4 py-4">
          <Link
            href={`/orders/${order.id}`}
            className="font-medium text-slate-950 transition-colors hover:text-primary"
          >
            {formatOrderShortId(order.id)}
          </Link>
        </td>
        <td className="px-4 py-4">{formatCustomerName(order.customer.name)}</td>
        <td className="px-4 py-4 align-middle">
          <div className="flex w-full items-center justify-center">
            <StatusBadgeFromViewModel badge={orderStatusBadge} />
          </div>
        </td>
        <td className="px-4 py-4 align-middle">
          <div className="flex w-full items-center justify-center">
            <StatusBadgeFromViewModel badge={getPaymentStatusBadge(order.paymentStatus)} />
          </div>
        </td>
        <td className="px-4 py-4 font-medium text-slate-950">
          {formatCurrencyCRC(order.totalCrc)}
        </td>
        <td className="px-4 py-4">{formatDateTime(order.createdAt)}</td>
        <td className="px-4 py-4 text-center text-sm text-muted-foreground">
          {order.deliveryDate ? formatCalendarDate(order.deliveryDate) : "Sin fecha"}
        </td>
        <td className="px-4 py-4 align-middle text-center">
          <div className="flex items-center justify-end gap-2">
            <OrderEditAction order={order} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={openDeleteDialog}
              disabled={deleteOrderMutation.isPending}
              aria-label={`Eliminar orden ${order.id}`}
              className="h-9 w-9 rounded-full text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </td>
      </tr>

      {isDeleteDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 px-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`delete-order-title-${order.id}`}
        >
          <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
                Confirmar accion
              </p>
              <h3
                id={`delete-order-title-${order.id}`}
                className="text-2xl font-semibold tracking-tight text-slate-950"
              >
                ¿Eliminar esta orden?
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Se eliminará la orden y también sus items y comprobantes asociados.
              </p>
            </div>

            {deleteError ? (
              <p className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {deleteError}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={closeDeleteDialog}
                disabled={deleteOrderMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleteOrderMutation.isPending}
                className="bg-rose-600 text-white hover:bg-rose-700"
              >
                {deleteOrderMutation.isPending ? "Eliminando..." : "Eliminar orden"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function OrdersTable({ orders, action }: OrdersTableProps) {
  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
            Orders
          </p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
              Operación de órdenes
            </h3>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            Vista transaccional para revisar estado, pago y monto total por orden.
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-[24px] border border-border/70">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border/70 text-left">
            <caption className="sr-only">
              Listado de órdenes con cliente, estado, pago, monto, fecha de creación y fecha de entrega.
            </caption>
            <thead className="bg-muted/40 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 text-center font-medium">ID</th>
                <th scope="col" className="px-4 py-3 text-center font-medium">Customer</th>
                <th scope="col" className="px-4 py-3 text-center font-medium">Status</th>
                <th scope="col" className="px-4 py-3 text-center font-medium">Payment status</th>
                <th scope="col" className="px-4 py-3 text-center font-medium">Total CRC</th>
                <th scope="col" className="px-4 py-3 text-center font-medium">Created</th>
                <th scope="col" className="px-4 py-3 text-center font-medium">Fecha Entrega</th>
                <th scope="col" className="px-4 py-3 text-center font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-white">
              {orders.length > 0 ? (
                orders.map((order) => <OrderRow key={order.id} order={order} />)
              ) : (
                <TableEmptyStateRow
                  colSpan={8}
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

"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { OrderStatusEnum } from "@prisma/client";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { Filter } from "lucide-react";

import type { DashboardRecentOrder } from "@/server/services/dashboard/types";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadgeFromViewModel } from "@/components/ui/status-badge";
import { TableEmptyStateRow } from "@/components/ui/state-display";
import { formatCurrencyCRC, formatDateTime } from "@/lib/formatters";
import {
  formatCustomerDisplayName,
  formatOrderShortId,
  formatOrderStatusLabel,
} from "@/domain/crm/formatters";
import { getOrderStatusBadge } from "@/components/orders/order-presenters";
import { cn } from "@/lib/utils";
import { RecentOrderPaymentCell } from "@/components/dashboard/recent-order-payment-cell";

type RecentOrdersTableProps = {
  orders: DashboardRecentOrder[];
  statusFilter?: OrderStatusEnum;
  onStatusFilterChange: (status?: OrderStatusEnum) => void;
  isApplyingFilter?: boolean;
};

export function RecentOrdersTable({
  orders,
  statusFilter,
  onStatusFilterChange,
  isApplyingFilter = false,
}: RecentOrdersTableProps) {
  const interactiveLinkClassName = cn(
    "inline-flex items-center rounded-md font-medium text-slate-950 underline decoration-transparent decoration-2 underline-offset-4 transition-colors duration-150",
    "hover:text-primary hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const statusOptions = useMemo(() => Object.values(OrderStatusEnum), []);
  const hasActiveFilter = statusFilter != null;
  const visibleOrders = useMemo(() => {
    if (statusFilter) {
      return orders.filter((order) => order.status === statusFilter);
    }

    return orders.filter((order) => order.status !== OrderStatusEnum.draft);
  }, [orders, statusFilter]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMenuOpen || !triggerRef.current) {
      return undefined;
    }

    function updateMenuPosition() {
      if (!triggerRef.current) {
        return;
      }

      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = 240;
      const menuMaxHeight = Math.min(window.innerHeight * 0.6, 420);
      const viewportPadding = 16;
      const left = Math.min(
        Math.max(viewportPadding, rect.left),
        window.innerWidth - menuWidth - viewportPadding,
      );
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const top =
        spaceBelow >= menuMaxHeight || rect.top < menuMaxHeight
          ? rect.bottom + 8
          : Math.max(viewportPadding, rect.top - menuMaxHeight - 8);

      setMenuPosition({
        top,
        left,
      });
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) {
      setMenuPosition(null);
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      const isInsideTrigger = triggerRef.current?.contains(target);
      const isInsideMenu = menuRef.current?.contains(target);

      if (!isInsideTrigger && !isInsideMenu) {
        setIsMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [statusFilter]);

  useEffect(() => {
    if (!isApplyingFilter) {
      return;
    }

    setIsMenuOpen(false);
    setMenuPosition(null);
  }, [isApplyingFilter]);

  function applyStatusFilter(nextStatus?: OrderStatusEnum) {
    onStatusFilterChange(nextStatus);
    setIsMenuOpen(false);
  }

  const menuPortal =
    isMounted && isMenuOpen && menuPosition
      ? createPortal(
          <div
            id={menuId}
            ref={menuRef}
            role="menu"
            aria-label="Filtrar por estado"
            className="fixed z-[100] max-h-[min(60vh,420px)] min-w-[240px] overflow-y-auto rounded-2xl border border-border/80 bg-white p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.14)]"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
            }}
          >
            <button
              type="button"
              role="menuitemradio"
              aria-checked={statusFilter == null}
              className={cn(
                "flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors",
                statusFilter == null ? "bg-slate-100 text-slate-950" : "text-slate-700 hover:bg-slate-50",
              )}
              onClick={() => applyStatusFilter(undefined)}
            >
              Limpiar filtro
            </button>
            {statusOptions.map((status) => (
              <button
                key={status}
                type="button"
                role="menuitemradio"
                aria-checked={statusFilter === status}
                className={cn(
                  "flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors",
                  statusFilter === status
                    ? "bg-slate-100 text-slate-950"
                    : "text-slate-700 hover:bg-slate-50",
                )}
                onClick={() => applyStatusFilter(status)}
              >
                {formatOrderStatusLabel(status)}
              </button>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
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
                  <th scope="col" className="px-4 py-3 font-medium">
                    <button
                      type="button"
                      ref={triggerRef}
                      className={cn(
                        "inline-flex items-center gap-1 font-medium uppercase tracking-[0.16em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                        hasActiveFilter
                          ? "text-slate-700"
                          : "text-muted-foreground hover:text-slate-700",
                      )}
                      aria-haspopup="menu"
                      aria-expanded={isMenuOpen}
                      aria-controls={menuId}
                      disabled={isApplyingFilter}
                      onClick={() => setIsMenuOpen((current) => !current)}
                    >
                      Estado
                      {hasActiveFilter ? <Filter className="h-3.5 w-3.5" /> : null}
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">Pago</th>
                  <th scope="col" className="px-4 py-3 font-medium">Creada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-white">
                {isApplyingFilter ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10">
                      <div className="flex flex-col items-center justify-center gap-3 text-center">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        <p className="text-sm font-medium text-slate-700">Aplicando filtro...</p>
                        <div className="grid w-full gap-3">
                          <Skeleton className="h-12 rounded-2xl" />
                          <Skeleton className="h-12 rounded-2xl" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : visibleOrders.length > 0 ? (
                  visibleOrders.map((order) => {
                    const orderBadge = getOrderStatusBadge(order.status);

                    return (
                      <tr key={order.id} className="text-sm text-slate-700">
                        <td className="px-4 py-4 font-medium text-slate-950">
                          <Link
                            href={`/orders/${order.id}`}
                            className={interactiveLinkClassName}
                            aria-label={`Abrir detalle de la orden ${formatOrderShortId(order.id)}`}
                          >
                            {formatOrderShortId(order.id)}
                          </Link>
                        </td>
                        <td className="px-4 py-4">
                          {order.customer.id ? (
                            <Link
                              href={`/customers/${order.customer.id}`}
                              className={interactiveLinkClassName}
                              aria-label={`Abrir detalle del cliente ${formatCustomerDisplayName(order.customer.name)}`}
                            >
                              {formatCustomerDisplayName(order.customer.name)}
                            </Link>
                          ) : (
                            <span className="font-medium text-slate-700">
                              {formatCustomerDisplayName(order.customer.name)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 font-medium text-slate-950">
                          {formatCurrencyCRC(order.totalCrc)}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadgeFromViewModel badge={orderBadge} />
                        </td>
                        <td className="px-4 py-4">
                          <RecentOrderPaymentCell
                            orderId={order.id}
                            orderStatus={order.status}
                            paymentStatus={order.paymentStatus}
                          />
                        </td>
                        <td className="px-4 py-4">{formatDateTime(order.createdAt)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <TableEmptyStateRow
                    colSpan={6}
                    title={
                      statusFilter
                        ? `No hay órdenes en estado ${formatOrderStatusLabel(statusFilter)}`
                        : "Todavía no hay órdenes recientes"
                    }
                    description={
                      statusFilter
                        ? "Prueba con otro estado o limpia el filtro para volver al comportamiento por defecto."
                        : "Cuando entren nuevas órdenes al CRM, este resumen mostrará las más recientes."
                    }
                  />
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      {menuPortal}
    </>
  );
}

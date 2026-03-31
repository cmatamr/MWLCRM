"use client";

import { useEffect, useRef, useState } from "react";
import { OrderStatusEnum } from "@prisma/client";
import { MoreHorizontal } from "lucide-react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { StatusBadgeFromViewModel } from "@/components/ui/status-badge";
import { getPaymentStatusBadge } from "@/components/orders/order-presenters";
import { useConfirmOrderPayment } from "@/hooks/use-confirm-order-payment";
import { cn } from "@/lib/utils";

const PAYMENT_PENDING_STATUSES = new Set([
  "pending",
  "pending_validation",
  "review",
  "payment_review",
]);

const PAYMENT_CONFIRMABLE_ORDER_STATUSES = new Set<OrderStatusEnum>([
  OrderStatusEnum.draft,
  OrderStatusEnum.quoted,
  OrderStatusEnum.pending_payment,
  OrderStatusEnum.payment_review,
  OrderStatusEnum.confirmed,
  OrderStatusEnum.in_design,
]);

function canConfirmPayment(status: OrderStatusEnum, paymentStatus: string) {
  return (
    PAYMENT_CONFIRMABLE_ORDER_STATUSES.has(status) &&
    PAYMENT_PENDING_STATUSES.has(paymentStatus.trim().toLowerCase())
  );
}

type RecentOrderPaymentCellProps = {
  orderId: string;
  orderStatus: OrderStatusEnum;
  paymentStatus: string;
};

export function RecentOrderPaymentCell({
  orderId,
  orderStatus,
  paymentStatus,
}: RecentOrderPaymentCellProps) {
  const mutation = useConfirmOrderPayment();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const effectivePaymentStatus = mutation.data?.paymentStatus ?? paymentStatus;
  const isConfirmable = canConfirmPayment(orderStatus, effectivePaymentStatus);
  const paymentBadge = getPaymentStatusBadge(effectivePaymentStatus);

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
      const menuWidth = 180;
      const viewportPadding = 16;
      const left = Math.min(
        Math.max(viewportPadding, rect.right - menuWidth),
        window.innerWidth - menuWidth - viewportPadding,
      );

      setMenuPosition({
        top: rect.bottom + 8,
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
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      const isInsideTriggerArea = containerRef.current?.contains(target);
      const isInsideMenu = menuRef.current?.contains(target);

      if (!isInsideTriggerArea && !isInsideMenu) {
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
    if (mutation.isSuccess) {
      setIsMenuOpen(false);
    }
  }, [mutation.isSuccess]);

  useEffect(() => {
    if (!isMenuOpen) {
      setMenuPosition(null);
    }
  }, [isMenuOpen]);

  async function handleConfirmPayment() {
    if (!isConfirmable || mutation.isPending) {
      return;
    }

    setIsMenuOpen(false);

    const confirmed = window.confirm("¿Confirmar pago verificado?");

    if (!confirmed) {
      return;
    }

    await mutation.mutateAsync(orderId);
  }

  const menuPortal =
    isMounted && isMenuOpen && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[100] min-w-[180px] overflow-hidden rounded-2xl border border-border/80 bg-white p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.14)]"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
            }}
          >
            <button
              type="button"
              role="menuitem"
              className={cn(
                "flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors",
                "hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200",
              )}
              onClick={handleConfirmPayment}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Confirmando..." : "Confirmar pago"}
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div ref={containerRef} className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <StatusBadgeFromViewModel badge={paymentBadge} />
          {isConfirmable ? (
            <div className="relative shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                ref={triggerRef}
                className="h-8 w-8 rounded-full border border-border/70 bg-white/80 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                aria-label="Abrir acciones de pago"
                onClick={() => setIsMenuOpen((current) => !current)}
                disabled={mutation.isPending}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>

        {mutation.isError ? (
          <p className="text-xs font-medium text-rose-700">{mutation.error.message}</p>
        ) : null}

        {mutation.isSuccess ? (
          <p className="text-xs font-medium text-emerald-700">
            Pago verificado y orden enviada a produccion.
          </p>
        ) : null}
      </div>

      {menuPortal}
    </>
  );
}

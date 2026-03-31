"use client";

import { useMemo } from "react";
import { OrderStatusEnum } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { useConfirmOrderPayment } from "@/hooks/use-confirm-order-payment";

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

type OrderPaymentActionsProps = {
  orderId: string;
  orderStatus: OrderStatusEnum;
  paymentStatus: string;
};

export function OrderPaymentActions({
  orderId,
  orderStatus,
  paymentStatus,
}: OrderPaymentActionsProps) {
  const mutation = useConfirmOrderPayment();
  const effectivePaymentStatus = mutation.data?.paymentStatus ?? paymentStatus;
  const isConfirmable = useMemo(
    () => canConfirmPayment(orderStatus, effectivePaymentStatus),
    [orderStatus, effectivePaymentStatus],
  );

  async function handleConfirmPayment() {
    if (!isConfirmable || mutation.isPending) {
      return;
    }

    const confirmed = window.confirm("¿Confirmar pago verificado?");

    if (!confirmed) {
      return;
    }

    await mutation.mutateAsync(orderId);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
        <Button
          type="button"
          className="w-full"
          onClick={handleConfirmPayment}
          disabled={!isConfirmable || mutation.isPending}
        >
          {mutation.isPending ? "Confirmando..." : "Confirmar pago"}
        </Button>
        <Button type="button" variant="outline" className="w-full" disabled>
          Más opciones
        </Button>
      </div>

      {!isConfirmable ? (
        <p className="text-xs leading-5 text-muted-foreground">
          El pago solo puede confirmarse cuando la orden y el estado de pago están en una etapa válida.
        </p>
      ) : null}

      {mutation.isError ? (
        <p className="text-xs font-medium text-rose-700">{mutation.error.message}</p>
      ) : null}

      {mutation.isSuccess ? (
        <p className="text-xs font-medium text-emerald-700">
          Pago verificado y orden enviada a produccion.
        </p>
      ) : null}
    </div>
  );
}

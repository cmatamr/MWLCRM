"use client";

import { OrderStatusEnum } from "@prisma/client";

import { StatusBadge } from "@/components/ui/status-badge";

type OrderPaymentActionsProps = {
  orderId: string;
  orderStatus: OrderStatusEnum;
  paymentStatus: string;
};

export function OrderPaymentActions({
  orderId: _orderId,
  orderStatus: _orderStatus,
  paymentStatus,
}: OrderPaymentActionsProps) {
  const normalizedPaymentStatus = paymentStatus.trim().toLowerCase();
  const isValidated = normalizedPaymentStatus === "validated";

  return (
    <div className="space-y-3">
      <StatusBadge tone={isValidated ? "success" : "warning"}>
        {isValidated ? "Validacion por comprobante activa" : "Pendiente de revision por comprobante"}
      </StatusBadge>
      <p className="text-xs leading-5 text-muted-foreground">
        La validacion de pagos ahora ocurre por comprobante individual. Esta vista queda en modo
        lectura hasta habilitar las acciones operativas del nuevo flujo.
      </p>
    </div>
  );
}

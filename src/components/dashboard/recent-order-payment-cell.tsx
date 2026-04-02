"use client";

import { OrderStatusEnum } from "@prisma/client";

import { StatusBadgeFromViewModel } from "@/components/ui/status-badge";
import { getPaymentStatusBadge } from "@/components/orders/order-presenters";

type RecentOrderPaymentCellProps = {
  orderId: string;
  orderStatus: OrderStatusEnum;
  paymentStatus: string;
  iconOnly?: boolean;
};

export function RecentOrderPaymentCell({
  orderId: _orderId,
  orderStatus: _orderStatus,
  paymentStatus,
  iconOnly = false,
}: RecentOrderPaymentCellProps) {
  const paymentBadge = getPaymentStatusBadge(paymentStatus);

  return (
    <div className={iconOnly ? undefined : "space-y-2"}>
      <StatusBadgeFromViewModel badge={paymentBadge} />
      {!iconOnly ? (
        <p className="text-xs text-muted-foreground">
          La validacion operativa se refleja por comprobante en el detalle de la orden.
        </p>
      ) : null}
    </div>
  );
}

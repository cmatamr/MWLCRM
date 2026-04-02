"use client";

import Link from "next/link";

import {
  OrderActionCenterCard,
  OrderPaymentSummaryCard,
} from "@/components/orders/order-detail-sidebar";
import { OrderItemsTable } from "@/components/orders/order-items-table";
import { OrderNotesCard } from "@/components/orders/order-notes-card";
import { OrderSummaryCard } from "@/components/orders/order-summary-card";
import { OrderTotalsCard } from "@/components/orders/order-totals-card";
import { PaymentReceiptsTable } from "@/components/orders/payment-receipts-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/page-loading";
import { StateDisplay } from "@/components/ui/state-display";
import { useOrderDetail } from "@/hooks/use-order-detail";
import type { OrderDetail } from "@/server/services/orders/types";

type OrderDetailViewProps = {
  orderId: string;
  initialOrder: OrderDetail;
};

export function OrderDetailView({ orderId, initialOrder }: OrderDetailViewProps) {
  const { data: order, isLoading, isError, error } = useOrderDetail(orderId, initialOrder);

  if (isLoading && !order) {
    return <PageLoading detailSidebar tables={1} />;
  }

  if (isError || !order) {
    return (
      <StateDisplay
        eyebrow="Orders"
        tone="error"
        title="No pudimos actualizar el detalle de la orden"
        description={error?.message ?? "Ocurrio un error controlado al consultar esta orden."}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <PageHeader
          title="Order Detail"
          description="Detalle operativo de la orden con contexto comercial, items y comprobantes para validación interna."
        />
        <Button asChild variant="outline">
          <Link href="/orders">Volver al listado</Link>
        </Button>
      </div>

      <OrderSummaryCard order={order} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)] xl:items-start">
        <div className="space-y-6">
          <OrderItemsTable orderId={order.id} items={order.items} />
          <OrderTotalsCard order={order} />
          <OrderNotesCard orderId={order.id} activities={order.activities} />
        </div>

        <div className="space-y-6">
          <OrderActionCenterCard order={order} />
          <OrderPaymentSummaryCard order={order} />
        </div>
      </div>

      <PaymentReceiptsTable orderId={order.id} receipts={order.receipts} />
    </div>
  );
}

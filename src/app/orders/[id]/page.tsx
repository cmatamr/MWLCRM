import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderItemsTable } from "@/components/orders/order-items-table";
import { OrderSummaryCard } from "@/components/orders/order-summary-card";
import { PaymentReceiptsTable } from "@/components/orders/payment-receipts-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getOrderDetail } from "@/server/services/orders";

export const dynamic = "force-dynamic";

type OrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;
  const order = await getOrderDetail(id);

  if (!order) {
    notFound();
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)]">
        <OrderItemsTable items={order.items} />
        <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
              Notes
            </p>
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                Notas de la orden
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Espacio listo para soportar operación, validaciones y futura edición.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-border/70 bg-slate-50/70 p-4">
            {order.notes?.trim() ? (
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{order.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Esta orden no tiene notas registradas todavía.
              </p>
            )}
          </div>
        </section>
      </div>

      <PaymentReceiptsTable receipts={order.receipts} />
    </div>
  );
}

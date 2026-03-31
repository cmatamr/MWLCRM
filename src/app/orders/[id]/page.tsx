import { notFound } from "next/navigation";

import { OrderDetailView } from "@/components/orders/order-detail-view";
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

  return <OrderDetailView orderId={id} initialOrder={order} />;
}

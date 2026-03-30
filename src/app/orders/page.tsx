import { OrderStatusEnum } from "@prisma/client";

import { OrdersPageClient } from "@/components/orders/orders-page-client";
import { getOrderFilterOptions } from "@/server/services/orders";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const filterOptions = await getOrderFilterOptions();

  return (
    <OrdersPageClient
      paymentStatusOptions={filterOptions.paymentStatuses}
      orderStatusOptions={Object.values(OrderStatusEnum)}
    />
  );
}

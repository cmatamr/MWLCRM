import { ChannelType } from "@prisma/client";

import { CustomersPageClient } from "@/components/customers/customers-page-client";

export const dynamic = "force-dynamic";

export default function CustomersPage() {
  return <CustomersPageClient channelOptions={Object.values(ChannelType)} />;
}

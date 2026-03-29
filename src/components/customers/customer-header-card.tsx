import type { CustomerDetail } from "@/server/services/customers/types";
import { formatDateTime } from "@/lib/formatters";
import { StatusBadge, StatusBadgeFromViewModel } from "@/components/ui/status-badge";

import {
  extractTagLabels,
  formatChannelLabel,
  getCustomerDisplayName,
  getCustomerStatusBadge,
  getCustomerInitials,
} from "./customer-presenters";

type CustomerHeaderCardProps = {
  customer: CustomerDetail;
};

export function CustomerHeaderCard({ customer }: CustomerHeaderCardProps) {
  const tags = extractTagLabels(customer.tags);
  const statusBadge = getCustomerStatusBadge(customer.customerStatus);

  return (
    <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-panel">
      <div className="bg-hero-grid p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-slate-950 text-lg font-semibold text-white">
              {getCustomerInitials(customer.displayName, customer.externalId)}
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
                  Customer profile
                </p>
                <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-950">
                  {getCustomerDisplayName(customer.displayName)}
                </h1>
                <p className="text-sm text-slate-600">External ID: {customer.externalId}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <StatusBadge>
                  {formatChannelLabel(customer.primaryChannel)}
                </StatusBadge>
                <StatusBadgeFromViewModel badge={statusBadge} />
                <StatusBadge>
                  Alta: {formatDateTime(customer.createdAt)}
                </StatusBadge>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-border/70 bg-white/85 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Última actualización
              </p>
              <p className="mt-1 text-sm font-medium text-slate-950">
                {formatDateTime(customer.updatedAt)}
              </p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-white/85 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Tags activas
              </p>
              <p className="mt-1 text-sm font-medium text-slate-950">{tags.length}</p>
            </div>
          </div>
        </div>

        {tags.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-medium text-primary"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

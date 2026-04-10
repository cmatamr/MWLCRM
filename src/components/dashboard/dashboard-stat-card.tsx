import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { DashboardMetric } from "@/server/services/dashboard/types";
import { cn } from "@/lib/utils";

import { formatMetricValue, getMetricChangeLabel } from "./dashboard-helpers";

type DashboardStatCardProps = {
  metric: DashboardMetric;
  className?: string;
};

const metricHrefMap: Partial<Record<DashboardMetric["key"], string>> = {
  totalOrders: "/orders",
  customersWithPurchase: "/customers",
  activeConversations: "/conversations",
};

export function DashboardStatCard({ metric, className }: DashboardStatCardProps) {
  const href = metricHrefMap[metric.key];
  const cardClassName = cn(
    "group block rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)] backdrop-blur transition-all duration-200",
    href
      ? "cursor-pointer hover:scale-[1.01] hover:shadow-[0_46px_78px_-30px_rgba(2,6,23,0.34),0_20px_40px_-16px_rgba(2,6,23,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      : "",
    className,
  );

  const cardContent = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
          <div className="space-y-1">
            <p className="text-3xl font-semibold tracking-tight text-slate-950">
              {formatMetricValue(metric)}
            </p>
            <p className="max-w-[28ch] text-sm leading-6 text-muted-foreground">
              {metric.description}
            </p>
          </div>
        </div>
        <div className="rounded-2xl bg-primary/10 p-3 text-primary transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
          <ArrowUpRight className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-muted/60 px-4 py-3 text-sm text-slate-700">
        {getMetricChangeLabel(metric)}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cardClassName} aria-label={`Ir a ${metric.label}`}>
        {cardContent}
      </Link>
    );
  }

  return (
    <article className={cardClassName}>{cardContent}</article>
  );
}

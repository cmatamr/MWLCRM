import { ArrowUpRight } from "lucide-react";

import type { DashboardMetric } from "@/server/services/dashboard/types";
import { cn } from "@/lib/utils";

import { formatMetricValue, getMetricChangeLabel } from "./dashboard-helpers";

type DashboardStatCardProps = {
  metric: DashboardMetric;
  className?: string;
};

export function DashboardStatCard({ metric, className }: DashboardStatCardProps) {
  return (
    <article
      className={cn(
        "rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur",
        className,
      )}
    >
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
        <div className="rounded-2xl bg-primary/10 p-3 text-primary">
          <ArrowUpRight className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-muted/60 px-4 py-3 text-sm text-slate-700">
        {getMetricChangeLabel(metric)}
      </div>
    </article>
  );
}

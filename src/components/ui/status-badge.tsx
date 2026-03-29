import type { ReactNode } from "react";

import type { BadgeTone, StatusBadgeViewModel } from "@/domain/crm/common";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
};

const badgeToneClassNames: Record<BadgeTone, string> = {
  neutral:
    "border border-border/80 bg-white/85 text-slate-700",
  info:
    "border border-primary/10 bg-primary/10 text-primary",
  success:
    "border border-emerald-200/80 bg-emerald-100 text-emerald-800",
  warning:
    "border border-amber-200/80 bg-amber-100 text-amber-800",
  danger:
    "border border-rose-200/80 bg-rose-100 text-rose-700",
};

export function StatusBadge({
  children,
  tone = "neutral",
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]",
        badgeToneClassNames[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadgeFromViewModel({
  badge,
  className,
}: {
  badge: StatusBadgeViewModel;
  className?: string;
}) {
  return (
    <StatusBadge tone={badge.tone} className={className}>
      {badge.label}
    </StatusBadge>
  );
}

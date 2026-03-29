import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, Inbox } from "lucide-react";

import { cn } from "@/lib/utils";

type StateDisplayProps = {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "error";
  className?: string;
  compact?: boolean;
};

export function StateDisplay({
  eyebrow,
  title,
  description,
  action,
  icon: Icon,
  tone = "default",
  className,
  compact = false,
}: StateDisplayProps) {
  const ResolvedIcon = Icon ?? (tone === "error" ? AlertCircle : Inbox);

  return (
    <section
      className={cn(
        "rounded-[36px] border bg-white/85 text-center shadow-[0_20px_60px_rgba(15,23,42,0.06)]",
        tone === "error"
          ? "border-rose-200/80"
          : "border-dashed border-border",
        compact ? "px-5 py-8" : "px-6 py-10 md:px-10",
        className,
      )}
    >
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <ResolvedIcon className="h-6 w-6" aria-hidden="true" />
        </div>
        {eyebrow ? (
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/70">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-2">
          <h3 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
            {title}
          </h3>
          <p className="text-sm leading-7 text-muted-foreground md:text-base">
            {description}
          </p>
        </div>
        {action ? <div className="flex justify-center">{action}</div> : null}
      </div>
    </section>
  );
}

export function InlineStateDisplay(props: Omit<StateDisplayProps, "compact">) {
  return <StateDisplay {...props} compact />;
}

export function TableEmptyStateRow({
  colSpan,
  title,
  description,
}: {
  colSpan: number;
  title: string;
  description: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8">
        <InlineStateDisplay
          title={title}
          description={description}
          className="border-dashed border-border bg-slate-50/70 shadow-none"
        />
      </td>
    </tr>
  );
}

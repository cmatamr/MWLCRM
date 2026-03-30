type DashboardWidgetPlaceholderProps = {
  title: string;
  description: string;
};

export function DashboardWidgetPlaceholder({
  title,
  description,
}: DashboardWidgetPlaceholderProps) {
  return (
    <section className="flex min-h-[220px] flex-col justify-between rounded-[32px] border border-dashed border-border/80 bg-white/60 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/55">
          Widget
        </p>
        <div className="space-y-1">
          <h3 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h3>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="mt-6 rounded-[24px] border border-border/70 bg-muted/30 px-4 py-5 text-sm text-muted-foreground">
        Disponible para futura implementacion.
      </div>
    </section>
  );
}

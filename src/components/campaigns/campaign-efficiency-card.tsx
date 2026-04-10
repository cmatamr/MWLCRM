import { formatCurrencyCRC } from "@/lib/formatters";
import type { CampaignsOverviewSummary } from "@/server/services/campaigns";

type CampaignEfficiencyCardProps = {
  overview: CampaignsOverviewSummary;
};

function formatRate(value: number) {
  return `${value.toFixed(2)}%`;
}

export function CampaignEfficiencyCard({ overview }: CampaignEfficiencyCardProps) {
  const primaryItems = [
    {
      label: "Conversion rate",
      value: formatRate(overview.leadToOrderConversionRate),
      tone: "bg-slate-950 text-white",
      labelTone: "text-slate-300",
    },
    {
      label: "Avg ticket",
      value: formatCurrencyCRC(overview.averageOrderValueCrc),
      tone: "bg-secondary text-secondary-foreground",
      labelTone: "",
    },
  ];
  const secondaryItems = [
    {
      label: "Costo por lead",
      value: formatCurrencyCRC(overview.costPerLeadCrc),
    },
    {
      label: "Revenue por lead",
      value: formatCurrencyCRC(overview.revenuePerLeadCrc),
    },
  ];

  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)]">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
            Efficiency
          </p>
          <div className="space-y-1">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
              Eficiencia comercial
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Métricas derivadas de órdenes atribuidas y revenue real del resultado filtrado.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {primaryItems.map((item) => (
            <article key={item.label} className={`rounded-2xl px-4 py-4 ${item.tone}`}>
              <p className={`text-xs uppercase tracking-[0.18em] ${item.labelTone}`.trim()}>
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-semibold">{item.value}</p>
            </article>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {secondaryItems.map((item) => (
            <article
              key={item.label}
              className="rounded-[22px] border border-border/70 bg-slate-50/70 px-4 py-4"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{item.value}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

import type { CampaignsOverviewSummary } from "@/server/services/campaigns";

type CampaignLeadQualityCardProps = {
  overview: CampaignsOverviewSummary;
};

function formatRate(value: number) {
  return `${value.toFixed(2)}%`;
}

export function CampaignLeadQualityCard({ overview }: CampaignLeadQualityCardProps) {
  const headlineItems = [
    { label: "Leads", value: overview.totalLeads.toLocaleString("es-CR") },
    { label: "Progresan", value: overview.progressedLeads.toLocaleString("es-CR") },
    { label: "Calificados", value: overview.qualifiedLeads.toLocaleString("es-CR") },
    { label: "Cotizan", value: overview.quotedLeads.toLocaleString("es-CR") },
    { label: "Compran", value: overview.wonLeads.toLocaleString("es-CR") },
  ];

  const rateItems = [
    { label: "% progreso", value: formatRate(overview.progressRate) },
    { label: "% calificación", value: formatRate(overview.qualificationRate) },
    { label: "% cotización", value: formatRate(overview.quoteRate) },
    { label: "% cierre", value: formatRate(overview.winRate) },
  ];

  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
            Lead Quality
          </p>
          <div className="space-y-1">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
              Calidad agregada de adquisición
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Lectura comercial del resultado filtrado sin bajar al detalle operativo del funnel.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {headlineItems.map((item) => (
            <article
              key={item.label}
              className="rounded-[22px] border border-border/70 bg-slate-50/70 px-4 py-4"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-2 text-xl font-semibold text-slate-950">{item.value}</p>
            </article>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {rateItems.map((item) => (
            <div key={item.label} className="rounded-2xl bg-muted px-4 py-4 text-slate-900">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-2 text-lg font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

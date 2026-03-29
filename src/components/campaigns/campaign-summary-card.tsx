import { formatCurrencyCRC, formatDate } from "@/lib/formatters";
import type { CampaignDetail } from "@/server/services/campaigns";

type CampaignSummaryCardProps = {
  campaign: CampaignDetail["campaign"];
  summary: CampaignDetail["summary"];
};

function formatText(value: string | null) {
  return value?.trim() || "Sin definir";
}

function getDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) {
    return "Sin fechas configuradas";
  }

  const start = startDate ? formatDate(startDate) : "Inicio abierto";
  const end = endDate ? formatDate(endDate) : "Activa";

  return `${start} - ${end}`;
}

export function CampaignSummaryCard({ campaign, summary }: CampaignSummaryCardProps) {
  const summaryItems = [
    {
      label: "Total spend",
      value: formatCurrencyCRC(summary.totalSpendCrc),
      hint: "Inversión registrada en campaign_spend",
    },
    {
      label: "Leads atribuidos",
      value: summary.attributedLeads.toLocaleString("es-CR"),
      hint: "Lead threads únicos atribuidos",
    },
    {
      label: "Órdenes atribuidas",
      value: summary.attributedOrders.toLocaleString("es-CR"),
      hint: "Órdenes únicas conectadas a esos leads",
    },
    {
      label: "Revenue atribuido",
      value: formatCurrencyCRC(summary.attributedRevenueCrc),
      hint: "Suma de órdenes atribuidas",
    },
  ];

  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                {formatText(campaign.platform)}
              </span>
              <span className="rounded-full border border-border/80 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                {formatText(campaign.objective)}
              </span>
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                {campaign.name}
              </h1>
              <p className="text-sm leading-6 text-muted-foreground">
                {getDateRange(campaign.startDate, campaign.endDate)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:w-[320px]">
            <div className="rounded-2xl bg-slate-950 px-4 py-4 text-white">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">ROAS</p>
              <p className="mt-2 text-2xl font-semibold">{summary.roas.toFixed(2)}x</p>
            </div>
            <div className="rounded-2xl bg-secondary px-4 py-4 text-secondary-foreground">
              <p className="text-xs uppercase tracking-[0.18em]">Conv. lead-order</p>
              <p className="mt-2 text-2xl font-semibold">
                {summary.leadToOrderConversionRate.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryItems.map((item) => (
            <article
              key={item.label}
              className="rounded-[24px] border border-border/70 bg-slate-50/70 p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {item.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{item.hint}</p>
            </article>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-[24px] border border-border/70 bg-white px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Costo por lead</p>
            <p className="mt-2 text-xl font-semibold text-slate-950">
              {formatCurrencyCRC(summary.costPerLeadCrc)}
            </p>
          </div>
          <div className="rounded-[24px] border border-border/70 bg-white px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Ticket promedio atribuido
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-950">
              {formatCurrencyCRC(summary.averageOrderValueCrc)}
            </p>
          </div>
          <div className="rounded-[24px] border border-border/70 bg-white px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Revenue por lead
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-950">
              {formatCurrencyCRC(summary.revenuePerLeadCrc)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

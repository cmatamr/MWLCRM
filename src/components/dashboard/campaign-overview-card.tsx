import type { DashboardCampaignOverview } from "@/server/services/dashboard/types";
import { formatCurrencyCRC } from "@/lib/formatters";

type CampaignOverviewCardProps = {
  overview: DashboardCampaignOverview;
};

function getCampaignDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) {
    return "Sin fechas configuradas";
  }

  const formatter = new Intl.DateTimeFormat("es-CR", {
    month: "short",
    day: "numeric",
  });

  const start = startDate ? formatter.format(new Date(startDate)) : "Inicio abierto";
  const end = endDate ? formatter.format(new Date(endDate)) : "Activa";

  return `${start} - ${end}`;
}

export function CampaignOverviewCard({ overview }: CampaignOverviewCardProps) {
  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
            Campaigns
          </p>
          <div className="space-y-1">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
              Resumen de campañas
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Inversión activa y campañas que más están generando leads atribuidos.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-950 px-4 py-4 text-center text-white">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Activas</p>
            <p className="mt-2 text-2xl font-semibold">{overview.activeCampaigns}</p>
          </div>
          <div className="rounded-2xl bg-secondary px-4 py-4 text-center text-secondary-foreground">
            <p className="text-xs uppercase tracking-[0.18em]">Spend</p>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrencyCRC(overview.totalSpendCrc)}
            </p>
          </div>
          <div className="rounded-2xl bg-muted px-4 py-4 text-center text-slate-900">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Leads</p>
            <p className="mt-2 text-2xl font-semibold">
              {overview.totalAttributedLeads.toLocaleString("es-CR")}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {overview.topCampaigns.length > 0 ? (
            overview.topCampaigns.map((campaign) => (
              <article
                key={campaign.id}
                className="rounded-[24px] border border-border/70 bg-muted/30 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-950">{campaign.name}</h4>
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                        {campaign.platform ?? "Canal mixto"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {campaign.objective ?? "Objetivo sin especificar"}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    {campaign.isActive ? "Activa" : "Finalizada"}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Leads atribuidos
                    </p>
                    <p className="mt-1 font-semibold text-slate-950">
                      {campaign.attributedLeads.toLocaleString("es-CR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Spend
                    </p>
                    <p className="mt-1 font-semibold text-slate-950">
                      {formatCurrencyCRC(campaign.spendCrc)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Ventana
                    </p>
                    <p className="mt-1 font-semibold text-slate-950">
                      {getCampaignDateRange(campaign.startDate, campaign.endDate)}
                    </p>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-border bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
              No hay campañas activas con datos atribuidos todavía.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

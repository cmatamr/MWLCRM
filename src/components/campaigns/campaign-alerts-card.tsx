import { AlertTriangle, CircleSlash, TrendingUp } from "lucide-react";

import type { CampaignsOverviewSummary } from "@/server/services/campaigns";

type CampaignAlertsCardProps = {
  overview: CampaignsOverviewSummary;
};

export function CampaignAlertsCard({ overview }: CampaignAlertsCardProps) {
  const alertItems = [
    {
      label: "Spend > 0 y revenue = 0",
      count: overview.spendWithoutRevenueCount,
      description: "Campañas con inversión visible sin retorno atribuido.",
      icon: CircleSlash,
      className: "border-rose-200/80 bg-rose-50/80 text-rose-950",
      iconClassName: "bg-rose-100 text-rose-700",
    },
    {
      label: "Leads > 10 y orders = 0",
      count: overview.highLeadNoOrderCount,
      description: "Volumen inicial, pero sin convertir a órdenes todavía.",
      icon: AlertTriangle,
      className: "border-amber-200/80 bg-amber-50/80 text-amber-950",
      iconClassName: "bg-amber-100 text-amber-700",
    },
    {
      label: "ROAS > 3",
      count: overview.highRoasCount,
      description: "Campañas con retorno especialmente fuerte.",
      icon: TrendingUp,
      className: "border-emerald-200/80 bg-emerald-50/80 text-emerald-950",
      iconClassName: "bg-emerald-100 text-emerald-700",
    },
  ];

  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
            Alerts
          </p>
          <div className="space-y-1">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
              Alertas accionables
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Señales rápidas para decidir dónde recortar, optimizar o escalar inversión.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {alertItems.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.label}
                className={`rounded-[24px] border px-4 py-4 ${item.className}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${item.iconClassName}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{item.label}</p>
                      <span className="text-xl font-semibold">{item.count}</span>
                    </div>
                    <p className="text-sm opacity-80">{item.description}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

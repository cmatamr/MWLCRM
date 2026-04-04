import Link from "next/link";

import { formatCurrencyCRC } from "@/lib/formatters";
import type { CampaignsListResponse } from "@/server/services/campaigns";
import { TableEmptyStateRow } from "@/components/ui/state-display";

type CampaignsTableProps = {
  campaigns: CampaignsListResponse["items"];
};

function formatText(value: string | null) {
  return value?.trim() || "Sin definir";
}

function formatRate(value: number) {
  return `${value.toFixed(2)}%`;
}

export function CampaignsTable({ campaigns }: CampaignsTableProps) {
  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
          Campaigns
        </p>
        <div className="space-y-1">
          <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
            Performance de campañas
          </h3>
          <p className="text-sm leading-6 text-muted-foreground">
            Gasto, adquisición y revenue atribuido por campaña para detectar retorno y calidad comercial.
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-[24px] border border-border/70">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border/70 text-left">
            <caption className="sr-only">
              Listado de campañas con plataforma, objetivo, gasto, leads, órdenes, ingresos, roas y conversión.
            </caption>
            <thead className="bg-muted/40 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Campaign</th>
                <th scope="col" className="px-4 py-3 font-medium">Platform</th>
                <th scope="col" className="px-4 py-3 font-medium">Objective</th>
                <th scope="col" className="px-4 py-3 font-medium">Spend</th>
                <th scope="col" className="px-4 py-3 font-medium">Leads</th>
                <th scope="col" className="px-4 py-3 font-medium">Orders</th>
                <th scope="col" className="px-4 py-3 font-medium">Revenue</th>
                <th scope="col" className="px-4 py-3 font-medium">ROAS</th>
                <th scope="col" className="px-4 py-3 font-medium">Conversion %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-white">
              {campaigns.length > 0 ? (
                campaigns.map((campaign) => (
                  <tr key={campaign.id} className="text-sm text-slate-700">
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <Link
                          href={`/funnel?campaign_id=${campaign.id}`}
                          className="font-medium text-slate-950 transition-colors hover:text-primary"
                        >
                          {campaign.name}
                        </Link>
                        <Link
                          href={`/campaigns/${campaign.id}`}
                          className="block text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                        >
                          Ver resumen
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-4">{formatText(campaign.platform)}</td>
                    <td className="px-4 py-4">{formatText(campaign.objective)}</td>
                    <td className="px-4 py-4 font-medium text-slate-950">
                      {formatCurrencyCRC(campaign.totalSpendCrc)}
                    </td>
                    <td className="px-4 py-4">{campaign.leads.toLocaleString("es-CR")}</td>
                    <td className="px-4 py-4">{campaign.orders.toLocaleString("es-CR")}</td>
                    <td className="px-4 py-4 font-medium text-slate-950">
                      {formatCurrencyCRC(campaign.revenueCrc)}
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-950">
                      {campaign.roas.toFixed(2)}x
                    </td>
                    <td className="px-4 py-4">{formatRate(campaign.conversionRate)}</td>
                  </tr>
                ))
              ) : (
                <TableEmptyStateRow
                  colSpan={9}
                  title="No hay datos disponibles"
                  description="No encontramos campanas para la busqueda actual. Ajusta los filtros o espera una nueva sincronizacion."
                />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

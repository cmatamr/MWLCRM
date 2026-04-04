import Link from "next/link";
import { notFound } from "next/navigation";

import { CampaignOrdersTable } from "@/components/campaigns/campaign-orders-table";
import { CampaignSpendChart } from "@/components/campaigns/campaign-spend-chart";
import { CampaignSummaryCard } from "@/components/campaigns/campaign-summary-card";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { TableEmptyStateRow } from "@/components/ui/state-display";
import { formatCurrencyCRC, formatDateTime } from "@/lib/formatters";
import { getCampaignDetail } from "@/server/services/campaigns";

export const dynamic = "force-dynamic";

type CampaignDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { id } = await params;
  const campaign = await getCampaignDetail(id);

  if (!campaign) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <PageHeader
          title="Campaign Detail"
          description="Vista analítica por campaña con resumen, evolución de gasto, leads atribuidos, órdenes e ingresos asociados."
        />
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href={`/funnel?campaign_id=${campaign.campaign.id}`}>Abrir Funnel filtrado</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/campaigns">Volver al listado</Link>
          </Button>
        </div>
      </div>

      <CampaignSummaryCard campaign={campaign.campaign} summary={campaign.summary} />

      <CampaignSpendChart data={campaign.spendSeries} />

      <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
            Leads
          </p>
          <div className="space-y-1">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
              Leads atribuidos
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Hilos únicos atribuidos a la campaña con su fecha de primer touch y revenue asociado.
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-border/70">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border/70 text-left">
              <caption className="sr-only">
                Leads atribuidos a la campaña con fecha de primer touch, órdenes e ingresos.
              </caption>
              <thead className="bg-muted/40 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Conversation</th>
                  <th scope="col" className="px-4 py-3 font-medium">Customer</th>
                  <th scope="col" className="px-4 py-3 font-medium">First touch</th>
                  <th scope="col" className="px-4 py-3 font-medium">Orders</th>
                  <th scope="col" className="px-4 py-3 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-white">
                {campaign.attributedLeads.length > 0 ? (
                  campaign.attributedLeads.map((lead) => (
                    <tr key={lead.leadThreadId} className="text-sm text-slate-700">
                      <td className="px-4 py-4 font-medium text-slate-950">{lead.leadThreadKey}</td>
                      <td className="px-4 py-4">{lead.customer.name ?? "Cliente no identificado"}</td>
                      <td className="px-4 py-4">{formatDateTime(lead.firstTouchAt)}</td>
                      <td className="px-4 py-4">{lead.orders.toLocaleString("es-CR")}</td>
                      <td className="px-4 py-4 font-medium text-slate-950">
                        {formatCurrencyCRC(lead.revenueCrc)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <TableEmptyStateRow
                    colSpan={5}
                    title="Esta campaña no tiene leads atribuidos"
                    description="Cuando existan hilos conectados a la campaña, aparecerán aquí con su revenue asociado."
                  />
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <CampaignOrdersTable orders={campaign.attributedOrders} />
    </div>
  );
}

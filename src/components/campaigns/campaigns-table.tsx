"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { TableEmptyStateRow } from "@/components/ui/state-display";
import { useSyncCampaigns } from "@/hooks/use-sync-campaigns";
import { formatCurrencyCRC } from "@/lib/formatters";
import type { ListCampaignsParams } from "@/server/services/campaigns";
import type { CampaignsListResponse } from "@/server/services/campaigns";

type CampaignsTableProps = {
  campaigns: CampaignsListResponse["items"];
  params?: ListCampaignsParams;
};

const CAMPAIGNS_SYNC_UI_STATE_KEY = "campaigns_sync_ui_state_v1";

type SyncStoredState = {
  hasSuccessfulSync: boolean;
  lastSuccessfulSyncHadCampaigns: boolean | null;
};

type SyncFeedbackTone = "success" | "error";

type SyncFeedback = {
  tone: SyncFeedbackTone;
  title: string;
  description: string;
  secondary?: string;
};

function formatText(value: string | null) {
  return value?.trim() || "Sin definir";
}

function formatRate(value: number) {
  return `${value.toFixed(2)}%`;
}

function readStoredSyncState(): SyncStoredState {
  if (typeof window === "undefined") {
    return {
      hasSuccessfulSync: false,
      lastSuccessfulSyncHadCampaigns: null,
    };
  }

  try {
    const rawValue = window.localStorage.getItem(CAMPAIGNS_SYNC_UI_STATE_KEY);
    if (!rawValue) {
      return {
        hasSuccessfulSync: false,
        lastSuccessfulSyncHadCampaigns: null,
      };
    }

    const parsed = JSON.parse(rawValue) as Partial<SyncStoredState>;

    return {
      hasSuccessfulSync: parsed.hasSuccessfulSync === true,
      lastSuccessfulSyncHadCampaigns:
        typeof parsed.lastSuccessfulSyncHadCampaigns === "boolean"
          ? parsed.lastSuccessfulSyncHadCampaigns
          : null,
    };
  } catch {
    return {
      hasSuccessfulSync: false,
      lastSuccessfulSyncHadCampaigns: null,
    };
  }
}

function writeStoredSyncState(value: SyncStoredState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CAMPAIGNS_SYNC_UI_STATE_KEY, JSON.stringify(value));
}

export function CampaignsTable({ campaigns, params }: CampaignsTableProps) {
  const syncMutation = useSyncCampaigns(params);
  const [syncState, setSyncState] = useState<SyncStoredState>({
    hasSuccessfulSync: false,
    lastSuccessfulSyncHadCampaigns: null,
  });
  const [syncFeedback, setSyncFeedback] = useState<SyncFeedback | null>(null);

  useEffect(() => {
    setSyncState(readStoredSyncState());
  }, []);

  useEffect(() => {
    if (!syncFeedback) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setSyncFeedback(null);
    }, 7000);

    return () => window.clearTimeout(timeout);
  }, [syncFeedback]);

  const isSearchFiltered = Boolean(params?.search?.trim());

  const emptyState = useMemo(() => {
    if (campaigns.length > 0) {
      return null;
    }

    if (isSearchFiltered) {
      return {
        title: "No hay campañas para este filtro",
        description:
          "No encontramos campañas para la búsqueda actual. Ajusta los filtros o intenta nuevamente.",
      };
    }

    if (!syncState.hasSuccessfulSync) {
      return {
        title: "Sincroniza tus campañas",
        description:
          "Aún no se han sincronizado campañas desde Meta. Haz clic en 'Sincronizar Campañas' para comenzar.",
      };
    }

    return {
      title: "No hay campañas sincronizadas",
      description:
        "La última sincronización se completó correctamente, pero no se encontraron campañas en Meta para la cuenta configurada.",
      helper: "Verifica el Ad Account o intenta sincronizar nuevamente.",
    };
  }, [campaigns.length, isSearchFiltered, syncState.hasSuccessfulSync]);

  const handleManualSync = () => {
    syncMutation.mutate(undefined, {
      onSuccess: (result) => {
        const hasCampaignsInMeta = result.campaignsRead > 0;
        const nextState: SyncStoredState = {
          hasSuccessfulSync: true,
          lastSuccessfulSyncHadCampaigns: hasCampaignsInMeta,
        };

        setSyncState(nextState);
        writeStoredSyncState(nextState);

        if (hasCampaignsInMeta) {
          setSyncFeedback({
            tone: "success",
            title: "Sincronización completada",
            description: "Se sincronizaron campañas correctamente.",
          });
          return;
        }

        setSyncFeedback({
          tone: "success",
          title: "Sincronización completada",
          description:
            "No se encontraron campañas disponibles en Meta para la cuenta configurada.",
          secondary:
            "Verifica que el Ad Account configurado sea correcto y que existan campañas visibles para esa cuenta.",
        });
      },
      onError: (error) => {
        setSyncFeedback({
          tone: "error",
          title: "Error en la sincronización",
          description: "No fue posible sincronizar las campañas. Intenta nuevamente.",
          secondary:
            error.message && error.message !== "No se pudo completar la sincronización de campañas."
              ? error.message
              : undefined,
        });
      },
    });
  };

  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
              Campaigns
            </p>
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
              Performance de campañas
            </h3>
          </div>
          <Button type="button" onClick={handleManualSync} disabled={syncMutation.isPending}>
            {syncMutation.isPending ? "Sincronizando..." : "Sincronizar Campañas"}
          </Button>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Gasto, adquisición y revenue atribuido por campaña para detectar retorno y calidad comercial.
        </p>
        {syncFeedback ? (
          <div
            className={
              syncFeedback.tone === "error"
                ? "rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3"
                : "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3"
            }
          >
            <p
              className={
                syncFeedback.tone === "error"
                  ? "text-sm font-semibold text-rose-900"
                  : "text-sm font-semibold text-emerald-900"
              }
            >
              {syncFeedback.title}
            </p>
            <p
              className={
                syncFeedback.tone === "error"
                  ? "mt-1 text-sm text-rose-800"
                  : "mt-1 text-sm text-emerald-800"
              }
            >
              {syncFeedback.description}
            </p>
            {syncFeedback.secondary ? (
              <p
                className={
                  syncFeedback.tone === "error"
                    ? "mt-1 text-xs text-rose-700"
                    : "mt-1 text-xs text-emerald-700"
                }
              >
                {syncFeedback.secondary}
              </p>
            ) : null}
          </div>
        ) : null}
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
              ) : emptyState ? (
                <TableEmptyStateRow
                  colSpan={9}
                  title={emptyState.title}
                  description={emptyState.description}
                  helper={emptyState.helper}
                />
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

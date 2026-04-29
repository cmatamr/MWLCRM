"use client";

import { useMemo, useState } from "react";
import { Activity, Bot, CalendarClock, DollarSign, Gauge, Power, Wallet } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { StateDisplay } from "@/components/ui/state-display";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAiDashboardSummary, useToggleClientAgent } from "@/hooks/use-ai-dashboard";
import { cn } from "@/lib/utils";

const CLIENT_CODE = "made-with-love";
const AGENT_CODE = "nova";
const FLOATING_CARD_CLASSNAME =
  "group rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)] backdrop-blur transition-all duration-200 hover:shadow-[0_46px_78px_-30px_rgba(2,6,23,0.34),0_20px_40px_-16px_rgba(2,6,23,0.24)]";
const AI_STAT_CARD_CLASSNAME =
  "group rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)] backdrop-blur transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_46px_78px_-30px_rgba(2,6,23,0.34),0_20px_40px_-16px_rgba(2,6,23,0.24)]";

function currency(value: number) {
  return new Intl.NumberFormat("es-CR", { style: "currency", currency: "USD" }).format(value);
}

function dateTime(value: string | null) {
  if (!value) return "Sin registros";
  return new Date(value).toLocaleString("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AiDashboardPageClient() {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const query = useAiDashboardSummary(CLIENT_CODE);
  const toggle = useToggleClientAgent(CLIENT_CODE, AGENT_CODE);

  const agent = query.data?.agent;
  const requiresTypedConfirm = agent?.enabled === true;

  const canSubmitToggle = useMemo(() => {
    if (!agent || toggle.isPending) {
      return false;
    }

    if (!requiresTypedConfirm) {
      return true;
    }

    return confirmText.trim().toLowerCase() === "pausar";
  }, [agent, toggle.isPending, requiresTypedConfirm, confirmText]);

  async function onConfirmToggle() {
    if (!agent) return;
    await toggle.mutateAsync(!agent.enabled);
    setIsConfirmOpen(false);
    setConfirmText("");
  }

  if (query.isLoading && !query.data) {
    return <StateDisplay title="Cargando Dashboard IA" description="Obteniendo estado y consumo de IA." />;
  }

  if (query.isError || !query.data) {
    return (
      <StateDisplay
        tone="error"
        title="No pudimos cargar el Dashboard IA"
        description={query.error?.message ?? "Ocurrió un error controlado."}
      />
    );
  }

  if (!agent) {
    return (
      <StateDisplay
        tone="error"
        title="No encontramos configuración de NOVA"
        description="El cliente no tiene estado de agente configurado."
      />
    );
  }

  const { billing, balance, dailyUsage, recentActivity, reconciliation } = query.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard IA"
        description="Control de NOVA, consumo de crédito y actividad reciente de IA."
      />

      <section className={FLOATING_CARD_CLASSNAME}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/80 bg-cyan-50/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-800">
              <Bot className="h-3.5 w-3.5" />
              NOVA
            </div>
            <StatusBadge tone={agent.enabled ? "success" : "danger"}>
              {agent.enabled ? "Encendida" : "Apagada"}
            </StatusBadge>
            <p className="max-w-3xl text-sm text-muted-foreground">
              {agent.enabled
                ? "NOVA gestiona automáticamente la atención al cliente."
                : "NOVA no gestionará la atención automáticamente. Las conversaciones deberán gestionarse manualmente."}
            </p>
            <p className="text-xs text-muted-foreground">
              Último cambio: {dateTime(agent.updatedAt)} · {agent.updatedBy.name || agent.updatedBy.email || "Sin usuario"}
            </p>
          </div>
          <Button onClick={() => setIsConfirmOpen(true)} disabled={toggle.isPending}>
            {agent.enabled ? "Apagar NOVA" : "Encender NOVA"}
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article className={AI_STAT_CARD_CLASSNAME}>
          <div className="mb-3 inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-700 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
            <Wallet className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Crédito mensual incluido</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{currency(billing?.includedMonthlyCreditUsd ?? 0)}</p>
        </article>
        <article className={AI_STAT_CARD_CLASSNAME}>
          <div className="mb-3 inline-flex rounded-2xl bg-amber-100 p-3 text-amber-700 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
            <DollarSign className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Consumido</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{currency(balance?.consumedUsd ?? 0)}</p>
        </article>
        <article className={AI_STAT_CARD_CLASSNAME}>
          <div className="mb-3 inline-flex rounded-2xl bg-sky-100 p-3 text-sky-700 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
            <Gauge className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Saldo disponible</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{currency(balance?.remainingUsd ?? 0)}</p>
        </article>
      </section>

      <section className={FLOATING_CARD_CLASSNAME}>
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-slate-500" />
          <h3 className="text-base font-semibold text-slate-900">Balance del periodo</h3>
        </div>
        {balance ? (
          <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
            <p>Periodo: {dateTime(balance.periodStart)} - {dateTime(balance.periodEnd)}</p>
            <p>Crédito adicional: {currency(balance.extraCreditUsd)}</p>
            <p>Porcentaje consumido: {balance.consumedPercent.toFixed(2)}%</p>
            <p>Estado: {balance.status}</p>
            <p>Última sincronización proveedor: {dateTime(reconciliation.lastSyncAt)}</p>
            <p>Reconciliación: {reconciliation.status ?? "sin datos"}</p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No existe cuenta de crédito para el periodo actual.</p>
        )}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200/70">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              (balance?.consumedPercent ?? 0) >= 90
                ? "bg-rose-500"
                : (balance?.consumedPercent ?? 0) >= 70
                  ? "bg-amber-500"
                  : "bg-emerald-500",
            )}
            style={{ width: `${Math.min(100, Math.max(0, balance?.consumedPercent ?? 0))}%` }}
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className={FLOATING_CARD_CLASSNAME}>
          <div className="mb-1 flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-500" />
            <h3 className="text-base font-semibold text-slate-900">Consumo diario</h3>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3">Solicitudes</th>
                  <th className="py-2 pr-3">Tokens</th>
                  <th className="py-2">Costo</th>
                </tr>
              </thead>
              <tbody>
                {dailyUsage.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-3 text-muted-foreground">Sin consumo diario registrado.</td>
                  </tr>
                ) : (
                  dailyUsage.map((row) => (
                    <tr key={row.usageDate} className="border-b border-border/50">
                      <td className="py-2 pr-3">{new Date(row.usageDate).toLocaleDateString("es-CR")}</td>
                      <td className="py-2 pr-3">{row.totalRequests}</td>
                      <td className="py-2 pr-3">{row.totalTokens}</td>
                      <td className="py-2">{currency(row.totalCostUsd)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className={FLOATING_CARD_CLASSNAME}>
          <div className="mb-1 flex items-center gap-2">
            <Power className="h-4 w-4 text-slate-500" />
            <h3 className="text-base font-semibold text-slate-900">Actividad reciente</h3>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {recentActivity.length === 0 ? (
              <li className="text-muted-foreground">Sin actividad reciente.</li>
            ) : (
              recentActivity.map((event) => (
                <li key={event.id} className="rounded-xl border border-white/80 bg-white/80 p-3 shadow-[0_14px_26px_-18px_rgba(2,6,23,0.28)] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_18px_30px_-18px_rgba(2,6,23,0.34)]">
                  <p className="font-medium text-slate-900">{event.title}</p>
                  <p className="text-muted-foreground">{event.description ?? "Sin descripción"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {dateTime(event.createdAt)} · {event.actorName || event.actorEmail || "Sistema"}
                  </p>
                </li>
              ))
            )}
          </ul>
        </article>
      </section>

      {isConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className={cn("w-full max-w-lg rounded-2xl border border-border bg-white p-6 shadow-xl")}>
            <h3 className="text-xl font-semibold text-slate-900">
              {agent.enabled ? "Pausar atención automática" : "Activar atención automática"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {agent.enabled
                ? "Al pausar NOVA, la atención automática quedará deshabilitada y las conversaciones deberán ser gestionadas manualmente por el equipo."
                : "NOVA comenzará a gestionar automáticamente la atención al cliente."}
            </p>

            {agent.enabled ? (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-slate-800">Escribe Pausar para confirmar.</p>
                <input
                  value={confirmText}
                  onChange={(event) => setConfirmText(event.target.value)}
                  placeholder='Escribe "Pausar"'
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none ring-primary/20 focus:ring"
                />
              </div>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => void onConfirmToggle()} disabled={!canSubmitToggle}>
                {agent.enabled ? "Pausar NOVA" : "Activar NOVA"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

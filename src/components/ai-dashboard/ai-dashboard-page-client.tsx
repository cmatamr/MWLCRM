"use client";

import { useMemo, useState } from "react";
import { Activity, AlertTriangle, Bot, CalendarClock, DollarSign, Gauge, Power, Wallet } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { StateDisplay } from "@/components/ui/state-display";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  useAiDashboardSummary,
  useSyncOpenAICosts,
  useToggleClientAgent,
  useUpsertOpenAIProviderProject,
} from "@/hooks/use-ai-dashboard";
import { ApiClientError } from "@/lib/api/crm";
import { cn } from "@/lib/utils";

const CLIENT_CODE = "made-with-love";
const AGENT_CODE = "nova";
const FLOATING_CARD_CLASSNAME =
  "group rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)] backdrop-blur transition-all duration-200 hover:shadow-[0_46px_78px_-30px_rgba(2,6,23,0.34),0_20px_40px_-16px_rgba(2,6,23,0.24)]";
const AI_STAT_CARD_CLASSNAME =
  "group rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)] backdrop-blur transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_46px_78px_-30px_rgba(2,6,23,0.34),0_20px_40px_-16px_rgba(2,6,23,0.24)]";
const AI_PANEL_CARD_CLASSNAME =
  "group rounded-[32px] border border-white/70 bg-gradient-to-b from-white/95 to-slate-50/85 p-6 shadow-[0_42px_74px_-34px_rgba(2,6,23,0.28),0_22px_44px_-24px_rgba(15,23,42,0.22)] backdrop-blur transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_48px_82px_-34px_rgba(2,6,23,0.34),0_26px_50px_-24px_rgba(15,23,42,0.26)]";

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

function maskProjectId(value: string | null) {
  if (!value) return "No configurado";
  if (value.length <= 10) return `${value.slice(0, 3)}***${value.slice(-2)}`;
  return `${value.slice(0, 8)}...${value.slice(-3)}`;
}

export function AiDashboardPageClient() {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [providerForm, setProviderForm] = useState({
    providerProjectId: "",
    providerProjectName: "",
    monthlyBudgetUsd: "0",
    status: "active" as "active" | "inactive" | "suspended" | "revoked",
  });
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const query = useAiDashboardSummary(CLIENT_CODE);
  const toggle = useToggleClientAgent(CLIENT_CODE, AGENT_CODE);
  const upsertProject = useUpsertOpenAIProviderProject(CLIENT_CODE);
  const syncCosts = useSyncOpenAICosts(CLIENT_CODE);

  const agent = query.data?.agent;
  const requiresTypedConfirm = agent?.enabled === true;

  const canSubmitToggle = useMemo(() => {
    if (!agent || toggle.isPending) return false;
    if (!requiresTypedConfirm) return true;
    return confirmText.trim().toLowerCase() === "pausar";
  }, [agent, toggle.isPending, requiresTypedConfirm, confirmText]);

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

  const {
    balance,
    dailyUsage,
    providerSyncedUsageByPeriod,
    recentActivity,
    reconciliation,
    providerUsage,
    providerProject,
    integrationStatus,
    permissions,
  } = query.data;

  const internalRecordedCostUsd = balance?.consumedUsd ?? 0;
  const providerReportedCostUsd = providerUsage.providerReportedCostUsd;
  const estimatedClientBalanceUsd =
    (balance?.includedCreditUsd ?? 0) + (balance?.extraCreditUsd ?? 0) - providerReportedCostUsd;
  const ledgerHasUsage = dailyUsage.some((row) => row.totalCostUsd > 0 || row.totalRequests > 0 || row.totalTokens > 0);
  const hasProviderOnlyUsage = !ledgerHasUsage && providerReportedCostUsd > 0;
  const internalTokens = dailyUsage.reduce((acc, row) => acc + row.totalTokens, 0);

  const canManageOpenAI = permissions.canManageOpenAIConfig;
  const canSync = Boolean(
    integrationStatus.openaiAdminKeyConfigured && providerProject.configured && balance,
  );

  async function onConfirmToggle() {
    if (!agent) return;
    await toggle.mutateAsync(!agent.enabled);
    setIsConfirmOpen(false);
    setConfirmText("");
  }

  function openProviderModal() {
    setProviderForm({
      providerProjectId: providerProject.providerProjectId ?? "",
      providerProjectName: providerProject.providerProjectName ?? "",
      monthlyBudgetUsd: String(providerProject.monthlyBudgetUsd ?? 0),
      status:
        providerProject.status === "not_configured"
          ? "active"
          : providerProject.status,
    });
    setIsProviderModalOpen(true);
    setFeedbackMessage(null);
  }

  async function submitProviderConfig() {
    const monthlyBudgetUsd = Number.parseFloat(providerForm.monthlyBudgetUsd);
    if (!providerForm.providerProjectId.trim()) {
      setFeedbackMessage("Project ID es requerido.");
      return;
    }
    if (!providerForm.providerProjectName.trim()) {
      setFeedbackMessage("Project Name es requerido.");
      return;
    }
    if (Number.isNaN(monthlyBudgetUsd) || monthlyBudgetUsd < 0) {
      setFeedbackMessage("Budget mensual debe ser mayor o igual a 0.");
      return;
    }

    try {
      await upsertProject.mutateAsync({
        provider: "openai",
        providerProjectId: providerForm.providerProjectId.trim(),
        providerProjectName: providerForm.providerProjectName.trim(),
        monthlyBudgetUsd,
        status: providerForm.status,
      });
      setIsProviderModalOpen(false);
      setFeedbackMessage("Configuración OpenAI guardada correctamente.");
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "No se pudo guardar configuración OpenAI.");
    }
  }

  async function syncCurrentPeriod() {
    if (!balance) {
      setFeedbackMessage("No hay periodo de balance para sincronizar.");
      return;
    }

    try {
      await syncCosts.mutateAsync({
        periodStart: `${balance.periodStart}T00:00:00.000Z`,
        periodEnd: `${balance.periodEnd}T23:59:59.999Z`,
      });
      setFeedbackMessage("Sincronización de consumo completada.");
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "OPENAI_COSTS_API_ERROR") {
        setFeedbackMessage("No se pudo sincronizar consumo en este momento. Intenta nuevamente.");
        return;
      }

      setFeedbackMessage("No se pudo sincronizar consumo en este momento. Intenta nuevamente.");
    }
  }

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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className={AI_STAT_CARD_CLASSNAME}>
          <div className="mb-3 inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-700 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
            <Wallet className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Crédito asignado cliente</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{currency((balance?.includedCreditUsd ?? 0) + (balance?.extraCreditUsd ?? 0))}</p>
        </article>
        <article className={AI_STAT_CARD_CLASSNAME}>
          <div className="mb-3 inline-flex rounded-2xl bg-amber-100 p-3 text-amber-700 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
            <DollarSign className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Consumo interno registrado</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{currency(internalRecordedCostUsd)}</p>
        </article>
        <article className={AI_STAT_CARD_CLASSNAME}>
          <div className="mb-3 inline-flex rounded-2xl bg-cyan-100 p-3 text-cyan-700 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
            <Gauge className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Consumo real OpenAI</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{currency(providerReportedCostUsd)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Estimado según OpenAI</p>
        </article>
        <article className={AI_STAT_CARD_CLASSNAME}>
          <div className="mb-3 inline-flex rounded-2xl bg-rose-100 p-3 text-rose-700 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
            <Activity className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Diferencia conciliación</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{currency(providerUsage.differenceUsd)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Estado: {providerUsage.status ?? "sin datos"}</p>
        </article>
        <article className={AI_STAT_CARD_CLASSNAME}>
          <div className="mb-3 inline-flex rounded-2xl bg-sky-100 p-3 text-sky-700 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
            <Gauge className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Saldo estimado cliente</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{currency(estimatedClientBalanceUsd)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Estimado según OpenAI</p>
        </article>
      </section>

      {hasProviderOnlyUsage ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <p>OpenAI reporta consumo, pero NOVA aún no está registrando uso interno en el ledger.</p>
          </div>
        </section>
      ) : null}

      <section className={AI_PANEL_CARD_CLASSNAME}>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-sky-50/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-sky-800">
            <CalendarClock className="h-3.5 w-3.5" />
            Balance
          </div>
          <h3 className="text-base font-semibold text-slate-900">Balance del periodo</h3>
        </div>
        {balance ? (
          <div className="mt-4 grid gap-3 rounded-2xl border border-white/70 bg-white/80 p-4 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] md:grid-cols-2">
            <p>Periodo: {dateTime(balance.periodStart)} - {dateTime(balance.periodEnd)}</p>
            <p>Crédito adicional: {currency(balance.extraCreditUsd)}</p>
            <p>Porcentaje consumido: {balance.consumedPercent.toFixed(2)}%</p>
            <p>Estado: {balance.status}</p>
            <p>Última sincronización proveedor: {dateTime(reconciliation.lastSyncAt)}</p>
            <p>Reconciliación: {reconciliation.status ?? "sin datos"}</p>
            <p>Consumo interno: {currency(internalRecordedCostUsd)}</p>
            <p>Consumo OpenAI: {currency(providerReportedCostUsd)}</p>
            <p>Diferencia: {currency(providerUsage.differenceUsd)}</p>
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

      <section className={FLOATING_CARD_CLASSNAME}>
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
              OpenAI
            </p>
            <div className="space-y-1">
              <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                Configuración OpenAI
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Estado de integración del cliente y habilitación de sincronización de consumo real.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-950 px-4 py-4 text-white">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Admin API Key</p>
              <p className="mt-2 text-2xl font-semibold">
                {integrationStatus.openaiAdminKeyConfigured ? "Sí" : "No"}
              </p>
            </div>
            <div className="rounded-2xl bg-secondary px-4 py-4 text-secondary-foreground">
              <p className="text-xs uppercase tracking-[0.18em]">Proyecto cliente</p>
              <p className="mt-2 text-2xl font-semibold">
                {providerProject.configured ? "Configurado" : "No configurado"}
              </p>
            </div>
            <div className="rounded-2xl bg-muted px-4 py-4 text-slate-900">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Estado</p>
              <p className="mt-2 text-2xl font-semibold">{providerProject.status}</p>
            </div>
          </div>

          <article className="rounded-[24px] border border-border/70 bg-muted/30 p-4">
            <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
              <p>Provider: <span className="font-semibold text-slate-950">OpenAI</span></p>
              <p>Project Name: <span className="font-semibold text-slate-950">{providerProject.providerProjectName ?? "No configurado"}</span></p>
              <p>Project ID: <span className="font-semibold text-slate-950">{maskProjectId(providerProject.providerProjectId)}</span></p>
              <p>Budget mensual: <span className="font-semibold text-slate-950">{providerProject.monthlyBudgetUsd == null ? "No configurado" : currency(providerProject.monthlyBudgetUsd)}</span></p>
            </div>
          </article>
        </div>

        {!integrationStatus.openaiAdminKeyConfigured ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            OpenAI Admin Key no configurada en servidor. Configúrala en variables de entorno.
          </p>
        ) : null}

        {!providerProject.configured ? (
          <p className="mt-4 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            Este cliente no tiene un proyecto OpenAI asociado. No es posible sincronizar consumo real.
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {canManageOpenAI ? (
            <Button variant="outline" onClick={openProviderModal}>
              {providerProject.configured ? "Editar configuración" : "Configurar OpenAI"}
            </Button>
          ) : null}
          <Button onClick={() => void syncCurrentPeriod()} disabled={!canSync || syncCosts.isPending}>
            Sincronizar consumo
          </Button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className={`${AI_PANEL_CARD_CLASSNAME} xl:col-span-2`}>
          <div className="mb-1 flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800">
              <Activity className="h-3.5 w-3.5" />
              Ledger
            </div>
            <h3 className="text-base font-semibold text-slate-900">Consumo diario interno</h3>
          </div>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/70 bg-white/80 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
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
                    <tr key={row.usageDate} className="border-b border-border/50 last:border-b-0">
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
          <div className="mt-4 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <p className="font-medium text-slate-900">Tokens internos registrados: {internalTokens}</p>
            <p className="mt-1 text-muted-foreground">
              Los tokens reales de OpenAI requieren integración con Usage API o instrumentación de NOVA.
            </p>
          </div>
        </article>

        <article className={AI_PANEL_CARD_CLASSNAME}>
          <div className="mb-1 flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/80 bg-cyan-50/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-800">
              <CalendarClock className="h-3.5 w-3.5" />
              Sync
            </div>
            <h3 className="text-base font-semibold text-slate-900">Consumo OpenAI sincronizado</h3>
          </div>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/70 bg-white/80 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Periodo</th>
                  <th className="py-2 pr-3">Consumo OpenAI</th>
                  <th className="py-2 pr-3">Consumo interno</th>
                  <th className="py-2 pr-3">Diferencia</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {providerSyncedUsageByPeriod.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-3 text-muted-foreground">Sin consumo OpenAI sincronizado por periodo.</td>
                  </tr>
                ) : (
                  providerSyncedUsageByPeriod.map((row) => (
                    <tr key={`${row.periodStart}-${row.syncedAt}`} className="border-b border-border/50 last:border-b-0">
                      <td className="py-2 pr-3">
                        {new Date(row.periodStart).toLocaleDateString("es-CR")} - {new Date(row.periodEnd).toLocaleDateString("es-CR")}
                      </td>
                      <td className="py-2 pr-3">{currency(row.providerReportedCostUsd)}</td>
                      <td className="py-2 pr-3">{currency(row.internalRecordedCostUsd)}</td>
                      <td className="py-2 pr-3">{currency(row.differenceUsd)}</td>
                      <td className="py-2">{row.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className={AI_PANEL_CARD_CLASSNAME}>
          <div className="mb-1 flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-violet-50/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-violet-800">
              <Power className="h-3.5 w-3.5" />
              Feed
            </div>
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
          <div className={cn("w-full max-w-2xl rounded-[30px] border border-white/75 bg-white/95 p-6 shadow-[0_40px_78px_-30px_rgba(2,6,23,0.45),0_18px_34px_-18px_rgba(2,6,23,0.3)] backdrop-blur")}>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">NOVA</p>
              <h3 className="text-3xl font-semibold tracking-tight text-slate-950">
                {agent.enabled ? "Pausar atención automática" : "Activar atención automática"}
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">
                {agent.enabled
                  ? "Al pausar NOVA, la atención automática quedará deshabilitada y las conversaciones deberán ser gestionadas manualmente por el equipo."
                  : "NOVA comenzará a gestionar automáticamente la atención al cliente."}
              </p>
            </div>

            {agent.enabled ? (
              <div className="mt-5 rounded-[24px] border border-border/70 bg-muted/20 p-4">
                <p className="text-sm font-semibold text-slate-800">Escribe Pausar para confirmar.</p>
                <input
                  value={confirmText}
                  onChange={(event) => setConfirmText(event.target.value)}
                  placeholder='Escribe "Pausar"'
                  className="mt-3 w-full rounded-2xl border border-border/80 bg-white px-4 py-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/65 focus:ring-2 focus:ring-primary/20"
                />
              </div>
            ) : null}

            <div className="mt-5 flex justify-end gap-2 border-t border-border/70 pt-4">
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

      {isProviderModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className={cn("w-full max-w-2xl rounded-[30px] border border-white/75 bg-white/95 p-6 shadow-[0_40px_78px_-30px_rgba(2,6,23,0.45),0_18px_34px_-18px_rgba(2,6,23,0.3)] backdrop-blur") }>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">OpenAI</p>
              <h3 className="text-3xl font-semibold tracking-tight text-slate-950">Configurar integración</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Asocia el proyecto OpenAI del cliente para habilitar sincronización de costos reales.
              </p>
            </div>

            <div className="mt-5 rounded-[24px] border border-border/70 bg-muted/20 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm sm:col-span-2">
                  <span className="mb-1 block text-slate-700">Project ID</span>
                  <input
                    value={providerForm.providerProjectId}
                    onChange={(event) => setProviderForm((prev) => ({ ...prev, providerProjectId: event.target.value }))}
                    className="w-full rounded-2xl border border-border/80 bg-white px-4 py-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/65 focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="text-sm sm:col-span-2">
                  <span className="mb-1 block text-slate-700">Project Name</span>
                  <input
                    value={providerForm.providerProjectName}
                    onChange={(event) => setProviderForm((prev) => ({ ...prev, providerProjectName: event.target.value }))}
                    className="w-full rounded-2xl border border-border/80 bg-white px-4 py-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/65 focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-slate-700">Budget mensual (USD)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={providerForm.monthlyBudgetUsd}
                    onChange={(event) => setProviderForm((prev) => ({ ...prev, monthlyBudgetUsd: event.target.value }))}
                    className="w-full rounded-2xl border border-border/80 bg-white px-4 py-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/65 focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-slate-700">Status</span>
                  <select
                    value={providerForm.status}
                    onChange={(event) =>
                      setProviderForm((prev) => ({
                        ...prev,
                        status: event.target.value as "active" | "inactive" | "suspended" | "revoked",
                      }))
                    }
                    className="w-full rounded-2xl border border-border/80 bg-white px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-primary/65 focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="suspended">suspended</option>
                    <option value="revoked">revoked</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-border/70 pt-4">
              <Button variant="outline" onClick={() => setIsProviderModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => void submitProviderConfig()} disabled={upsertProject.isPending}>
                Guardar configuración
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {feedbackMessage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className={cn("w-full max-w-2xl rounded-[30px] border border-white/75 bg-white/95 p-6 shadow-[0_40px_78px_-30px_rgba(2,6,23,0.45),0_18px_34px_-18px_rgba(2,6,23,0.3)] backdrop-blur")}>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">Notificación</p>
              <h3 className="text-3xl font-semibold tracking-tight text-slate-950">Sincronización OpenAI</h3>
              <p className="max-w-2xl text-[1.05rem] leading-9 text-muted-foreground">{feedbackMessage}</p>
            </div>
            <div className="mt-8 flex justify-end border-t border-border/70 pt-5">
              <Button className="min-w-44 rounded-full px-8" onClick={() => setFeedbackMessage(null)}>
                Aceptar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

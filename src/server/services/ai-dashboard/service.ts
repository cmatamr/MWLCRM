import { z } from "zod";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { ApiRouteError, badRequest, notFound } from "@/server/api/http";

import type {
  AiDashboardSummary,
  SyncOpenAICostsInput,
  SyncOpenAICostsResult,
  ToggleClientAgentInput,
  ToggleClientAgentResult,
  UpsertOpenAIProviderProjectInput,
  UpsertOpenAIProviderProjectResult,
} from "./types";

const openAICostsResponseSchema = z.object({
  data: z.array(z.record(z.string(), z.unknown())).optional(),
});

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function getNestedNumber(source: unknown, paths: string[][]): number {
  if (!source || typeof source !== "object") {
    return 0;
  }

  for (const path of paths) {
    let cursor: unknown = source;
    for (const key of path) {
      if (!cursor || typeof cursor !== "object") {
        cursor = undefined;
        break;
      }
      cursor = (cursor as Record<string, unknown>)[key];
    }

    const value = asNumber(cursor);
    if (value !== 0) {
      return value;
    }
  }

  return 0;
}

export async function getAiDashboardSummary(clientCode: string): Promise<AiDashboardSummary> {
  const service = createSupabaseServiceClient();

  const { data: client, error: clientError } = await service
    .from("clients")
    .select("id, code, name")
    .eq("code", clientCode)
    .maybeSingle<{ id: string; code: string; name: string }>();

  if (clientError) {
    throw clientError;
  }

  if (!client) {
    throw notFound("Cliente no encontrado.");
  }

  const [
    agentStatusRes,
    billingRes,
    balanceRes,
    dailyUsageRes,
    recentActivityRes,
    reconciliationRes,
    reconciliationPeriodsRes,
    providerProjectRes,
  ] = await Promise.all([
    service
      .from("client_agent_status_view")
      .select(
        "agent_id, agent_code, agent_name, enabled, updated_at, updated_by, updated_by_email, updated_by_name",
      )
      .eq("client_id", client.id)
      .eq("agent_code", "nova")
      .maybeSingle<{
        agent_id: string;
        agent_code: string;
        agent_name: string;
        enabled: boolean;
        updated_at: string | null;
        updated_by: string | null;
        updated_by_email: string | null;
        updated_by_name: string | null;
      }>(),
    service
      .from("client_ai_billing_settings")
      .select(
        "included_monthly_credit_usd, low_balance_threshold_percent, critical_balance_threshold_percent, credits_expire_monthly",
      )
      .eq("client_id", client.id)
      .maybeSingle<{
        included_monthly_credit_usd: number | string;
        low_balance_threshold_percent: number | string;
        critical_balance_threshold_percent: number | string;
        credits_expire_monthly: boolean;
      }>(),
    service
      .from("client_ai_balance_view")
      .select(
        "period_start, period_end, included_credit_usd, extra_credit_usd, consumed_usd, remaining_usd, consumed_percent, status",
      )
      .eq("client_id", client.id)
      .order("period_start", { ascending: false })
      .limit(1)
      .maybeSingle<{
        period_start: string;
        period_end: string;
        included_credit_usd: number | string;
        extra_credit_usd: number | string;
        consumed_usd: number | string;
        remaining_usd: number | string;
        consumed_percent: number | string;
        status: string;
      }>(),
    service
      .from("client_ai_usage_daily_view")
      .select("usage_date, total_requests, total_tokens, total_cost_usd")
      .eq("client_id", client.id)
      .order("usage_date", { ascending: false })
      .limit(31)
      .returns<
        Array<{
          usage_date: string;
          total_requests: number;
          total_tokens: number | string;
          total_cost_usd: number | string;
        }>
      >(),
    service
      .from("client_activity_events")
      .select("id, event_type, title, description, actor_name, actor_email, source, created_at")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false })
      .limit(15)
      .returns<
        Array<{
          id: string;
          event_type: string;
          title: string;
          description: string | null;
          actor_name: string | null;
          actor_email: string | null;
          source: string;
          created_at: string;
        }>
      >(),
    service
      .from("ai_usage_reconciliation")
      .select(
        "status, created_at, period_start, period_end, provider_reported_cost_usd, internal_recorded_cost_usd, difference_usd, provider_project_id",
      )
      .eq("client_id", client.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{
        status: "pending" | "matched" | "mismatch" | "reviewed";
        created_at: string;
        period_start: string;
        period_end: string;
        provider_reported_cost_usd: number | string;
        internal_recorded_cost_usd: number | string;
        difference_usd: number | string;
        provider_project_id: string;
      }>(),
    service
      .from("ai_usage_reconciliation")
      .select(
        "status, created_at, period_start, period_end, provider_reported_cost_usd, internal_recorded_cost_usd, difference_usd, provider_project_id",
      )
      .eq("client_id", client.id)
      .order("period_start", { ascending: false })
      .limit(12)
      .returns<
        Array<{
          status: "pending" | "matched" | "mismatch" | "reviewed";
          created_at: string;
          period_start: string;
          period_end: string;
          provider_reported_cost_usd: number | string;
          internal_recorded_cost_usd: number | string;
          difference_usd: number | string;
          provider_project_id: string;
        }>
      >(),
    service
      .from("client_ai_provider_projects")
      .select("provider, provider_project_id, provider_project_name, monthly_budget_usd, status")
      .eq("client_id", client.id)
      .eq("provider", "openai")
      .maybeSingle<{
        provider: "openai";
        provider_project_id: string | null;
        provider_project_name: string | null;
        monthly_budget_usd: number | string | null;
        status: "active" | "inactive" | "suspended" | "revoked";
      }>(),
  ]);

  if (agentStatusRes.error || billingRes.error || balanceRes.error || dailyUsageRes.error || recentActivityRes.error || reconciliationRes.error || reconciliationPeriodsRes.error || providerProjectRes.error) {
    throw (
      agentStatusRes.error ??
      billingRes.error ??
      balanceRes.error ??
      dailyUsageRes.error ??
      recentActivityRes.error ??
      reconciliationRes.error ??
      reconciliationPeriodsRes.error ??
      providerProjectRes.error
    );
  }

  if (!agentStatusRes.data) {
    throw notFound("No existe configuracion client_agent para NOVA.");
  }

  const latestReconciliation = (() => {
    const rows = reconciliationPeriodsRes.data ?? [];
    if (rows.length === 0) return null;

    const providerProjectId = providerProjectRes.data?.provider_project_id?.trim();
    const periodStart = balanceRes.data?.period_start;
    const periodEnd = balanceRes.data?.period_end;

    const periodProjectMatch = rows.find(
      (row) =>
        (!!providerProjectId ? row.provider_project_id === providerProjectId : true) &&
        (!!periodStart ? row.period_start === periodStart : true) &&
        (!!periodEnd ? row.period_end === periodEnd : true),
    );

    if (periodProjectMatch) {
      return periodProjectMatch;
    }

    if (providerProjectId) {
      const projectMatch = rows.find((row) => row.provider_project_id === providerProjectId);
      if (projectMatch) {
        return projectMatch;
      }
    }

    return rows[0] ?? null;
  })();


  return {
    client,
    agent: {
      id: agentStatusRes.data.agent_id,
      code: agentStatusRes.data.agent_code,
      name: agentStatusRes.data.agent_name,
      enabled: agentStatusRes.data.enabled,
      updatedAt: agentStatusRes.data.updated_at,
      updatedBy: {
        id: agentStatusRes.data.updated_by,
        email: agentStatusRes.data.updated_by_email,
        name: agentStatusRes.data.updated_by_name,
      },
    },
    billing: billingRes.data
      ? {
          includedMonthlyCreditUsd: asNumber(billingRes.data.included_monthly_credit_usd),
          lowBalanceThresholdPercent: asNumber(billingRes.data.low_balance_threshold_percent),
          criticalBalanceThresholdPercent: asNumber(billingRes.data.critical_balance_threshold_percent),
          creditsExpireMonthly: billingRes.data.credits_expire_monthly,
        }
      : null,
    balance: balanceRes.data
      ? {
          periodStart: balanceRes.data.period_start,
          periodEnd: balanceRes.data.period_end,
          includedCreditUsd: asNumber(balanceRes.data.included_credit_usd),
          extraCreditUsd: asNumber(balanceRes.data.extra_credit_usd),
          consumedUsd: asNumber(balanceRes.data.consumed_usd),
          remainingUsd: asNumber(balanceRes.data.remaining_usd),
          consumedPercent: asNumber(balanceRes.data.consumed_percent),
          status: balanceRes.data.status,
        }
      : null,
    dailyUsage: (dailyUsageRes.data ?? [])
      .map((row) => ({
        usageDate: row.usage_date,
        totalRequests: row.total_requests,
        totalTokens: asNumber(row.total_tokens),
        totalCostUsd: asNumber(row.total_cost_usd),
      }))
      .reverse(),
    providerSyncedUsageByPeriod: (reconciliationPeriodsRes.data ?? [])
      .map((row) => ({
        periodStart: row.period_start,
        periodEnd: row.period_end,
        providerReportedCostUsd: asNumber(row.provider_reported_cost_usd),
        internalRecordedCostUsd: asNumber(row.internal_recorded_cost_usd),
        differenceUsd: asNumber(row.difference_usd),
        status: row.status,
        syncedAt: row.created_at,
      }))
      .reverse(),
    recentActivity: (recentActivityRes.data ?? []).map((row) => ({
      id: row.id,
      eventType: row.event_type,
      title: row.title,
      description: row.description,
      actorName: row.actor_name,
      actorEmail: row.actor_email,
      source: row.source,
      createdAt: row.created_at,
    })),
    reconciliation: {
      status: latestReconciliation?.status ?? reconciliationRes.data?.status ?? null,
      lastSyncAt: latestReconciliation?.created_at ?? reconciliationRes.data?.created_at ?? null,
    },
    providerUsage: {
      lastSyncAt: latestReconciliation?.created_at ?? reconciliationRes.data?.created_at ?? null,
      providerReportedCostUsd: asNumber(
        latestReconciliation?.provider_reported_cost_usd ?? reconciliationRes.data?.provider_reported_cost_usd,
      ),
      internalRecordedCostUsd: asNumber(
        latestReconciliation?.internal_recorded_cost_usd ?? reconciliationRes.data?.internal_recorded_cost_usd,
      ),
      differenceUsd: asNumber(latestReconciliation?.difference_usd ?? reconciliationRes.data?.difference_usd),
      status: latestReconciliation?.status ?? reconciliationRes.data?.status ?? null,
    },
    providerProject: providerProjectRes.data
      ? (() => {
          const configured = Boolean(
            providerProjectRes.data.provider_project_id &&
              providerProjectRes.data.provider_project_id.trim().length > 0,
          );
          return {
            provider: "openai" as const,
            providerProjectId: providerProjectRes.data.provider_project_id,
            providerProjectName: providerProjectRes.data.provider_project_name,
            monthlyBudgetUsd:
              providerProjectRes.data.monthly_budget_usd == null
                ? null
                : asNumber(providerProjectRes.data.monthly_budget_usd),
            status: configured ? providerProjectRes.data.status : ("not_configured" as const),
            configured,
          };
        })()
      : {
          provider: "openai",
          providerProjectId: null,
          providerProjectName: null,
          monthlyBudgetUsd: null,
          status: "not_configured",
          configured: false,
        },
    integrationStatus: {
      openaiAdminKeyConfigured: Boolean(process.env.OPENAI_ADMIN_API_KEY?.trim()),
    },
    permissions: {
      canManageOpenAIConfig: false,
    },
  };
}

export async function syncOpenAIUsageForClient(
  clientCode: string,
  periodStart: string,
  periodEnd: string,
): Promise<{ implemented: false; reason: string; clientCode: string; periodStart: string; periodEnd: string }> {
  return {
    implemented: false,
    reason: "Pendiente integración con OpenAI Usage API o instrumentación interna.",
    clientCode,
    periodStart,
    periodEnd,
  };
}

export async function upsertOpenAIProviderProjectForClient(
  input: UpsertOpenAIProviderProjectInput,
): Promise<UpsertOpenAIProviderProjectResult> {
  const service = createSupabaseServiceClient();

  const { data: client, error: clientError } = await service
    .from("clients")
    .select("id, code")
    .eq("code", input.clientCode)
    .maybeSingle<{ id: string; code: string }>();

  if (clientError) {
    throw clientError;
  }
  if (!client) {
    throw notFound("Cliente no encontrado.");
  }

  const { data: existing, error: existingError } = await service
    .from("client_ai_provider_projects")
    .select("id")
    .eq("client_id", client.id)
    .eq("provider", "openai")
    .maybeSingle<{ id: string }>();

  if (existingError) {
    throw existingError;
  }

  const operation: "created" | "updated" = existing ? "updated" : "created";

  const payload = {
    client_id: client.id,
    provider: "openai" as const,
    provider_project_id: input.providerProjectId,
    provider_project_name: input.providerProjectName,
    monthly_budget_usd: input.monthlyBudgetUsd,
    status: input.status,
  };

  const { error: upsertError } = await service
    .from("client_ai_provider_projects")
    .upsert(payload, { onConflict: "client_id,provider" });

  if (upsertError) {
    throw upsertError;
  }

  const actorLabel = input.actor.name?.trim() || input.actor.email?.trim() || "usuario";
  const { error: eventError } = await service.from("client_activity_events").insert({
    client_id: client.id,
    actor_user_id: input.actor.userId,
    actor_email: input.actor.email,
    actor_name: input.actor.name,
    entity_type: "ai_provider_project",
    entity_id: null,
    event_type: operation,
    title: "Configuración OpenAI actualizada",
    description: `Configuración OpenAI ${operation === "created" ? "creada" : "actualizada"} por ${actorLabel}.`,
    old_values: null,
    new_values: {
      provider_project_id: input.providerProjectId,
      provider_project_name: input.providerProjectName,
      monthly_budget_usd: input.monthlyBudgetUsd,
      status: input.status,
    },
    source: "admin",
    metadata: {
      clientCode: input.clientCode,
      provider: "openai",
      providerProjectName: input.providerProjectName,
    },
  });

  if (eventError) {
    throw new ApiRouteError({
      status: 500,
      code: "AI_PROVIDER_PROJECT_EVENT_FAILED",
      message: "No se pudo registrar evento de configuración OpenAI.",
      details: eventError,
    });
  }

  return {
    clientCode: client.code,
    provider: "openai",
    providerProjectId: input.providerProjectId,
    providerProjectName: input.providerProjectName,
    monthlyBudgetUsd: input.monthlyBudgetUsd,
    status: input.status,
    configured: true,
    operation,
  };
}

export async function toggleClientAgent(
  input: ToggleClientAgentInput,
): Promise<ToggleClientAgentResult> {
  const service = createSupabaseServiceClient();

  const { data, error } = await service.rpc("toggle_client_agent_with_event", {
    p_client_code: input.clientCode,
    p_agent_code: input.agentCode,
    p_enabled: input.enabled,
    p_actor_user_id: input.actor.userId,
    p_actor_email: input.actor.email,
    p_actor_name: input.actor.name,
    p_source: "dashboard",
  });

  if (error) {
    if (error.message?.includes("CLIENT_NOT_FOUND")) {
      throw notFound("Cliente no encontrado.");
    }

    if (error.message?.includes("CLIENT_AGENT_NOT_FOUND")) {
      throw notFound("Relacion cliente/agente no encontrada.");
    }

    if (error.message?.includes("AGENT_NOT_FOUND")) {
      throw notFound("Agente no encontrado.");
    }

    throw new ApiRouteError({
      status: 500,
      code: "TOGGLE_CLIENT_AGENT_RPC_FAILED",
      message: "No se pudo cambiar el estado del agente de forma atómica.",
      details: error,
    });
  }

  const row = (data as Array<{ enabled: boolean }> | null)?.[0];
  return { enabled: row?.enabled ?? input.enabled };
}

export async function syncOpenAICostsForClient(
  input: SyncOpenAICostsInput,
): Promise<SyncOpenAICostsResult> {
  const service = createSupabaseServiceClient();
  const toleranceUsd = input.toleranceUsd ?? 0.01;

  const { data: client, error: clientError } = await service
    .from("clients")
    .select("id, code")
    .eq("code", input.clientCode)
    .maybeSingle<{ id: string; code: string }>();

  if (clientError) {
    throw clientError;
  }
  if (!client) {
    throw notFound("Cliente no encontrado.");
  }

  const { data: project, error: projectError } = await service
    .from("client_ai_provider_projects")
    .select("provider, provider_project_id, provider_project_name, status")
    .eq("client_id", client.id)
    .eq("provider", "openai")
    .maybeSingle<{
      provider: "openai";
      provider_project_id: string | null;
      provider_project_name: string | null;
      status: string;
    }>();

  if (projectError) {
    throw projectError;
  }
  if (!project?.provider_project_id?.trim()) {
    throw new ApiRouteError({
      status: 400,
      code: "OPENAI_PROJECT_NOT_CONFIGURED",
      message: "El cliente no tiene proyecto OpenAI configurado.",
    });
  }
  const providerProjectId = project.provider_project_id;

  const adminApiKey = process.env.OPENAI_ADMIN_API_KEY?.trim();
  if (!adminApiKey) {
    throw new ApiRouteError({
      status: 503,
      code: "OPENAI_ADMIN_KEY_NOT_CONFIGURED",
      message: "OpenAI Admin Key no configurada en servidor.",
    });
  }

  const periodStart = new Date(input.periodStart);
  const periodEnd = new Date(input.periodEnd);
  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime()) || periodEnd <= periodStart) {
    throw badRequest("periodStart/periodEnd inválidos.");
  }

  let providerReportedCostUsd = 0;
  let rawProviderPayload: unknown = {};
  let status: "pending" | "matched" | "mismatch" | "reviewed" = "pending";
  let parsedCostEntries = 0;

  {
    const url = new URL("https://api.openai.com/v1/organization/costs");
    url.searchParams.set("start_time", `${Math.floor(periodStart.getTime() / 1000)}`);
    url.searchParams.set("end_time", `${Math.floor(periodEnd.getTime() / 1000)}`);
    url.searchParams.set("bucket_width", "1d");
    // OpenAI Costs API expects array params as repeated keys (project_ids=...)
    // instead of bracket notation (project_ids[]=...).
    url.searchParams.append("project_ids", providerProjectId);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${adminApiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const responseText = await response.text();

    if (!response.ok) {
      const isForbidden = response.status === 403;
      throw new ApiRouteError({
        status: 502,
        code: "OPENAI_COSTS_API_ERROR",
        message: isForbidden
          ? "OpenAI Costs API respondió 403 (sin permisos para endpoint de organización)."
          : `OpenAI Costs API respondió ${response.status}.`,
        details: {
          responseBodyPreview: responseText.slice(0, 600),
          hint: isForbidden
            ? "Verifica que OPENAI_ADMIN_API_KEY sea una Admin Key de organización con permisos de lectura de Usage/Costs."
            : undefined,
        },
      });
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(responseText);
    } catch {
      throw new ApiRouteError({
        status: 502,
        code: "OPENAI_COSTS_INVALID_JSON",
        message: "OpenAI Costs API devolvió JSON inválido.",
      });
    }

    const payload = openAICostsResponseSchema.parse(parsedJson);
    rawProviderPayload = payload;

    providerReportedCostUsd = (payload.data ?? []).reduce<number>((acc, item) => {
      const value = getNestedNumber(item, [
        ["amount", "value"],
        ["cost", "value"],
        ["results", "amount", "value"],
        ["results", "cost", "value"],
      ]);

      if (value !== 0) {
        parsedCostEntries += 1;
        return acc + value;
      }

      if (item && typeof item === "object") {
        const results = (item as Record<string, unknown>).results;
        if (Array.isArray(results)) {
          return (
            acc +
            results.reduce(
              (bucket, result) =>
                (() => {
                  const nestedValue = getNestedNumber(result, [
                  ["amount", "value"],
                  ["cost", "value"],
                  ["amount"],
                  ["cost"],
                  ]);
                  if (nestedValue !== 0) {
                    parsedCostEntries += 1;
                  }
                  return bucket + nestedValue;
                })(),
              0,
            )
          );
        }
      }

      return acc;
    }, 0);

    if ((payload.data ?? []).length > 0 && parsedCostEntries === 0) {
      throw new ApiRouteError({
        status: 502,
        code: "OPENAI_COSTS_PAYLOAD_UNEXPECTED",
        message: "No se pudieron extraer costos del payload de OpenAI Costs API.",
        details: {
          dataItems: (payload.data ?? []).length,
        },
      });
    }
  }

  const { data: internalRows, error: internalError } = await service
    .from("ai_usage_ledger")
    .select("estimated_cost_usd")
    .eq("client_id", client.id)
    .gte("created_at", periodStart.toISOString())
    .lte("created_at", periodEnd.toISOString())
    .eq("status", "success")
    .returns<Array<{ estimated_cost_usd: number | string }>>();

  if (internalError) {
    throw internalError;
  }

  const internalRecordedCostUsd = (internalRows ?? []).reduce(
    (acc, row) => acc + asNumber(row.estimated_cost_usd),
    0,
  );
  const differenceUsd = Number((providerReportedCostUsd - internalRecordedCostUsd).toFixed(6));

  status = Math.abs(differenceUsd) <= toleranceUsd ? "matched" : "mismatch";

  const insertPayload = {
    client_id: client.id,
    provider: "openai",
    provider_project_id: providerProjectId,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    internal_recorded_cost_usd: internalRecordedCostUsd,
    provider_reported_cost_usd: providerReportedCostUsd,
    difference_usd: differenceUsd,
    status,
    raw_provider_payload: rawProviderPayload,
    metadata: {
      providerProjectName: project.provider_project_name ?? null,
      toleranceUsd,
    },
  };

  const { error: reconciliationError } = await service
    .from("ai_usage_reconciliation")
    .insert(insertPayload);

  if (reconciliationError) {
    throw reconciliationError;
  }

  if (status === "mismatch") {
    await service.from("client_activity_events").insert({
      client_id: client.id,
      entity_type: "billing",
      entity_id: null,
      event_type: "reconciliation_mismatch",
      title: "Diferencia de conciliacion detectada",
      description: `Se detecto diferencia de ${differenceUsd.toFixed(4)} USD en conciliacion OpenAI.`,
      old_values: null,
      new_values: {
        provider_reported_cost_usd: providerReportedCostUsd,
        internal_recorded_cost_usd: internalRecordedCostUsd,
        difference_usd: differenceUsd,
      },
      source: "admin",
      metadata: {
        provider: "openai",
        provider_project_id: providerProjectId,
      },
    });
  }

  return {
    clientCode: client.code,
    provider: "openai",
    providerProjectId: providerProjectId,
    providerProjectName: project.provider_project_name ?? "unknown",
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    internalRecordedCostUsd,
    providerReportedCostUsd,
    differenceUsd,
    status,
  };
}

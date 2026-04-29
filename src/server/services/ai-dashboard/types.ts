export type AiDashboardSummary = {
  client: {
    id: string;
    code: string;
    name: string;
  };
  agent: {
    id: string;
    code: string;
    name: string;
    enabled: boolean;
    updatedAt: string | null;
    updatedBy: {
      id: string | null;
      email: string | null;
      name: string | null;
    };
  };
  billing: {
    includedMonthlyCreditUsd: number;
    lowBalanceThresholdPercent: number;
    criticalBalanceThresholdPercent: number;
    creditsExpireMonthly: boolean;
  } | null;
  balance: {
    periodStart: string;
    periodEnd: string;
    includedCreditUsd: number;
    extraCreditUsd: number;
    consumedUsd: number;
    remainingUsd: number;
    consumedPercent: number;
    status: string;
  } | null;
  dailyUsage: Array<{
    usageDate: string;
    totalRequests: number;
    totalTokens: number;
    totalCostUsd: number;
  }>;
  recentActivity: Array<{
    id: string;
    eventType: string;
    title: string;
    description: string | null;
    actorName: string | null;
    actorEmail: string | null;
    source: string;
    createdAt: string;
  }>;
  reconciliation: {
    status: "pending" | "matched" | "mismatch" | "reviewed" | null;
    lastSyncAt: string | null;
  };
  providerProject: {
    provider: "openai";
    providerProjectId: string | null;
    providerProjectName: string | null;
    monthlyBudgetUsd: number | null;
    status: "active" | "inactive" | "suspended" | "revoked" | "not_configured";
    configured: boolean;
  };
  integrationStatus: {
    openaiAdminKeyConfigured: boolean;
  };
  permissions: {
    canManageOpenAIConfig: boolean;
  };
};

export type ToggleClientAgentInput = {
  clientCode: string;
  agentCode: string;
  enabled: boolean;
  actor: {
    userId: string;
    email: string | null;
    name: string | null;
  };
};

export type ToggleClientAgentResult = {
  enabled: boolean;
};

export type SyncOpenAICostsInput = {
  clientCode: string;
  periodStart: string;
  periodEnd: string;
  toleranceUsd?: number;
};

export type SyncOpenAICostsResult = {
  clientCode: string;
  provider: "openai";
  providerProjectId: string;
  providerProjectName: string;
  periodStart: string;
  periodEnd: string;
  internalRecordedCostUsd: number;
  providerReportedCostUsd: number;
  differenceUsd: number;
  status: "pending" | "matched" | "mismatch" | "reviewed";
};

export type UpsertOpenAIProviderProjectInput = {
  clientCode: string;
  actor: {
    userId: string;
    email: string | null;
    name: string | null;
  };
  provider: "openai";
  providerProjectId: string;
  providerProjectName: string;
  monthlyBudgetUsd: number;
  status: "active" | "inactive" | "suspended" | "revoked";
};

export type UpsertOpenAIProviderProjectResult = {
  clientCode: string;
  provider: "openai";
  providerProjectId: string;
  providerProjectName: string;
  monthlyBudgetUsd: number;
  status: "active" | "inactive" | "suspended" | "revoked";
  configured: true;
  operation: "created" | "updated";
};

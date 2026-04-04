const DEFAULT_META_API_VERSION = "v23.0";

export const campaignSyncConfig = {
  cron: {
    // Vercel triggers every minute; this value controls the effective sync cadence.
    intervalMinutes: 30,
    routePath: "/api/internal/cron/meta-campaign-sync",
    baseSchedule: "* * * * *",
  },
  spend: {
    lookbackDays: 7,
  },
  meta: {
    apiVersion: DEFAULT_META_API_VERSION,
    campaignPageSize: 100,
    insightsPageSize: 100,
    platform: "meta",
    expectedAccountCurrency: "CRC",
    allowNonCrcSpendAmount: false,
    relevantEffectiveStatuses: [
      "ACTIVE",
      "PAUSED",
      "ARCHIVED",
      "DELETED",
      "IN_PROCESS",
      "WITH_ISSUES",
      "CAMPAIGN_PAUSED",
      "ADSET_PAUSED",
    ],
    requestTimeoutMs: 20_000,
  },
} as const;

export type CampaignSyncConfig = typeof campaignSyncConfig;

export function shouldRunCampaignSyncAt(date: Date, intervalMinutes: number): boolean {
  if (!Number.isInteger(intervalMinutes) || intervalMinutes <= 0 || intervalMinutes > 60) {
    return false;
  }

  return date.getUTCMinutes() % intervalMinutes === 0;
}

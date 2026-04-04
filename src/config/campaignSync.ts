const DEFAULT_META_API_VERSION = "v23.0";

export const campaignSyncConfig = {
  cron: {
    // Vercel triggers every minute; this value controls the effective sync cadence.
    intervalMinutes: 1_440,
    routePath: "/api/internal/cron/meta-campaign-sync",
    baseSchedule: "0 3 * * *",
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
    // Leave empty to avoid Meta 400 caused by invalid enum combinations.
    relevantEffectiveStatuses: [],
    requestTimeoutMs: 20_000,
  },
} as const;

export type CampaignSyncConfig = typeof campaignSyncConfig;

export function shouldRunCampaignSyncAt(date: Date, intervalMinutes: number): boolean {
  if (!Number.isInteger(intervalMinutes) || intervalMinutes <= 0) {
    return false;
  }

  const epochMinutes = Math.floor(date.getTime() / 60_000);
  return epochMinutes % intervalMinutes === 0;
}

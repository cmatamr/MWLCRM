export interface MetaCampaignApiRecord {
  id: string;
  name: string;
  objective?: string;
  status?: string;
  effective_status?: string;
  start_time?: string;
  stop_time?: string;
  updated_time?: string;
}

export interface MetaInsightApiRecord {
  campaign_id?: string;
  date_start: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  cpc?: string;
  ctr?: string;
  account_currency?: string;
}

export interface CampaignUpsertInput {
  metaCampaignId: string;
  name: string;
  platform: string;
  objective: string | null;
  status: string | null;
  startDate: Date | null;
  endDate: Date | null;
  updatedAt: Date;
}

export interface CampaignSpendUpsertInput {
  campaignUuid: string;
  date: Date;
  amountCrc: number;
  impressions: number | null;
  clicks: number | null;
  cpc: number | null;
  ctr: number | null;
}

export interface CampaignSyncResult {
  skipped: boolean;
  reason?: string;
  intervalMinutes: number;
  lookbackDays: number;
  campaignsRead: number;
  campaignsUpserted: number;
  spendRowsRead: number;
  spendRowsInserted: number;
  spendRowsUpdated: number;
  spendRowsSkippedCurrency: number;
  durationMs: number;
  startedAt: string;
  finishedAt: string;
}

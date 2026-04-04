import { campaignSyncConfig } from "@/config/campaignSync";

import type {
  CampaignSpendUpsertInput,
  CampaignUpsertInput,
  MetaCampaignApiRecord,
  MetaInsightApiRecord,
} from "./types";

function parseIsoDateOnly(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

function parseIsoDateTime(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function parseOptionalInt(value?: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalDecimal(value?: string, fractionDigits = 2): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Number(parsed.toFixed(fractionDigits));
}

export function mapMetaCampaignToCampaignUpsert(input: MetaCampaignApiRecord): CampaignUpsertInput {
  const now = new Date();

  return {
    metaCampaignId: input.id,
    name: input.name,
    platform: campaignSyncConfig.meta.platform,
    objective: input.objective?.trim() || null,
    status: input.effective_status ?? input.status ?? null,
    startDate: parseIsoDateOnly(input.start_time),
    endDate: parseIsoDateOnly(input.stop_time),
    updatedAt: parseIsoDateTime(input.updated_time) ?? now,
  };
}

export function mapMetaInsightToCampaignSpendUpsert(input: {
  campaignUuid: string;
  record: MetaInsightApiRecord;
}): CampaignSpendUpsertInput {
  const parsedDate = parseIsoDateOnly(input.record.date_start);
  if (!parsedDate) {
    throw new Error(`Invalid insight date_start: ${input.record.date_start}`);
  }

  return {
    campaignUuid: input.campaignUuid,
    date: parsedDate,
    amountCrc: Number((Number.parseFloat(input.record.spend ?? "0") || 0).toFixed(2)),
    impressions: parseOptionalInt(input.record.impressions),
    clicks: parseOptionalInt(input.record.clicks),
    cpc: parseOptionalDecimal(input.record.cpc, 2),
    ctr: parseOptionalDecimal(input.record.ctr, 2),
  };
}

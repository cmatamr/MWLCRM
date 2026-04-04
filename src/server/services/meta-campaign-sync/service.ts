import { Prisma } from "@prisma/client";

import { campaignSyncConfig, shouldRunCampaignSyncAt } from "@/config/campaignSync";
import { resolveDb, type ServiceOptions } from "@/server/services/shared";

import { mapMetaCampaignToCampaignUpsert, mapMetaInsightToCampaignSpendUpsert } from "./mappers";
import { MetaApiClient } from "./meta-api";
import type { CampaignSyncResult, CampaignUpsertInput } from "./types";

type Logger = Pick<typeof console, "info" | "warn" | "error">;

type RunMetaCampaignSyncOptions = ServiceOptions & {
  now?: Date;
  force?: boolean;
  logger?: Logger;
};

type ExistingCampaignRecord = {
  id: string;
  metaCampaignId: string | null;
};

type ExistingSpendRecord = {
  id: string;
  campaignId: string | null;
  date: Date;
};

function formatUtcDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildLookbackWindow(now: Date, lookbackDays: number): { since: string; until: string } {
  const normalizedNow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const sinceDate = new Date(normalizedNow);
  sinceDate.setUTCDate(sinceDate.getUTCDate() - Math.max(0, lookbackDays - 1));

  return {
    since: formatUtcDate(sinceDate),
    until: formatUtcDate(normalizedNow),
  };
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function spendKey(input: { campaignUuid: string; date: Date }): string {
  return `${input.campaignUuid}:${formatUtcDate(input.date)}`;
}

async function upsertCampaigns(input: {
  campaigns: CampaignUpsertInput[];
  logger: Logger;
  options?: ServiceOptions;
}) {
  const db = resolveDb(input.options);
  const now = new Date();
  const campaignIdByMetaId = new Map<string, string>();

  if (input.campaigns.length === 0) {
    return {
      campaignIdByMetaId,
      upserted: 0,
    };
  }

  const metaIds = [...new Set(input.campaigns.map((campaign) => campaign.metaCampaignId))];
  const existingRows = await db.$queryRaw<ExistingCampaignRecord[]>(Prisma.sql`
    SELECT
      id::text AS "id",
      meta_campaign_id AS "metaCampaignId"
    FROM campaigns
    WHERE meta_campaign_id IN (${Prisma.join(metaIds)})
    ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
  `);

  for (const row of existingRows) {
    if (!row.metaCampaignId || campaignIdByMetaId.has(row.metaCampaignId)) {
      continue;
    }
    campaignIdByMetaId.set(row.metaCampaignId, row.id);
  }

  let upserted = 0;

  for (const campaign of input.campaigns) {
    const existingId = campaignIdByMetaId.get(campaign.metaCampaignId);

    if (existingId) {
      await db.$executeRaw(Prisma.sql`
        UPDATE campaigns
        SET
          name = ${campaign.name},
          platform = ${campaign.platform},
          objective = ${campaign.objective},
          status = ${campaign.status},
          start_date = ${campaign.startDate},
          end_date = ${campaign.endDate},
          updated_at = ${campaign.updatedAt}
        WHERE id = ${existingId}::uuid
      `);
      upserted += 1;
      continue;
    }

    const inserted = await db.$queryRaw<{ id: string }[]>(Prisma.sql`
      INSERT INTO campaigns (
        name,
        platform,
        objective,
        start_date,
        end_date,
        meta_campaign_id,
        status,
        created_at,
        updated_at
      )
      VALUES (
        ${campaign.name},
        ${campaign.platform},
        ${campaign.objective},
        ${campaign.startDate},
        ${campaign.endDate},
        ${campaign.metaCampaignId},
        ${campaign.status},
        ${now},
        ${campaign.updatedAt}
      )
      RETURNING id::text AS "id"
    `);

    const insertedId = inserted[0]?.id;
    if (!insertedId) {
      input.logger.warn("[meta-sync] Campaign insert did not return id", {
        metaCampaignId: campaign.metaCampaignId,
      });
      continue;
    }

    campaignIdByMetaId.set(campaign.metaCampaignId, insertedId);
    upserted += 1;
  }

  return { campaignIdByMetaId, upserted };
}

async function upsertCampaignSpend(input: {
  spendRows: {
    campaignUuid: string;
    date: Date;
    amountCrc: number;
    impressions: number | null;
    clicks: number | null;
    cpc: number | null;
    ctr: number | null;
  }[];
  since: string;
  until: string;
  options?: ServiceOptions;
}) {
  const db = resolveDb(input.options);
  const now = new Date();

  if (input.spendRows.length === 0) {
    return { inserted: 0, updated: 0 };
  }

  const campaignIds = [...new Set(input.spendRows.map((row) => row.campaignUuid))];
  const existingRows = await db.$queryRaw<ExistingSpendRecord[]>(Prisma.sql`
    SELECT
      id::text AS "id",
      campaign_id::text AS "campaignId",
      date
    FROM campaign_spend
    WHERE campaign_id IN (${Prisma.join(campaignIds)})
      AND date >= ${input.since}::date
      AND date <= ${input.until}::date
  `);

  const existingByKey = new Map<string, ExistingSpendRecord>();
  for (const row of existingRows) {
    if (!row.campaignId) {
      continue;
    }

    const key = `${row.campaignId}:${formatUtcDate(row.date)}`;
    if (!existingByKey.has(key)) {
      existingByKey.set(key, row);
    }
  }

  let inserted = 0;
  let updated = 0;

  for (const row of input.spendRows) {
    const key = spendKey(row);
    const existing = existingByKey.get(key);

    if (existing) {
      await db.$executeRaw(Prisma.sql`
        UPDATE campaign_spend
        SET
          amount_crc = ${row.amountCrc},
          impressions = ${row.impressions},
          clicks = ${row.clicks},
          cpc = ${row.cpc},
          ctr = ${row.ctr}
        WHERE id = ${existing.id}::uuid
      `);
      updated += 1;
      continue;
    }

    await db.$executeRaw(Prisma.sql`
      INSERT INTO campaign_spend (
        campaign_id,
        date,
        amount_crc,
        impressions,
        clicks,
        cpc,
        ctr,
        created_at
      )
      VALUES (
        ${row.campaignUuid}::uuid,
        ${formatUtcDate(row.date)}::date,
        ${row.amountCrc},
        ${row.impressions},
        ${row.clicks},
        ${row.cpc},
        ${row.ctr},
        ${now}
      )
    `);
    inserted += 1;
  }

  return { inserted, updated };
}

export async function runMetaCampaignSync(
  options: RunMetaCampaignSyncOptions = {},
): Promise<CampaignSyncResult> {
  const logger = options.logger ?? console;
  const startedAtDate = options.now ?? new Date();
  const startedAtMs = Date.now();
  const intervalMinutes = campaignSyncConfig.cron.intervalMinutes;
  const lookbackDays = campaignSyncConfig.spend.lookbackDays;

  if (!options.force && !shouldRunCampaignSyncAt(startedAtDate, intervalMinutes)) {
    return {
      skipped: true,
      reason: "outside_interval_window",
      intervalMinutes,
      lookbackDays,
      campaignsRead: 0,
      campaignsUpserted: 0,
      spendRowsRead: 0,
      spendRowsInserted: 0,
      spendRowsUpdated: 0,
      spendRowsSkippedCurrency: 0,
      durationMs: Date.now() - startedAtMs,
      startedAt: startedAtDate.toISOString(),
      finishedAt: new Date().toISOString(),
    };
  }

  const accessToken = getRequiredEnv("META_ACCESS_TOKEN");
  const adAccountId = getRequiredEnv("META_AD_ACCOUNT_ID");
  const expectedAccountCurrency = campaignSyncConfig.meta.expectedAccountCurrency.toUpperCase();
  const allowNonCrcAmount = campaignSyncConfig.meta.allowNonCrcSpendAmount;

  logger.info("[meta-sync] Started campaign sync", {
    intervalMinutes,
    lookbackDays,
  });

  const api = new MetaApiClient({
    accessToken,
    adAccountId,
  });

  const campaignsFromMeta = await api.listCampaigns(campaignSyncConfig.meta.campaignPageSize);
  const campaignRows = campaignsFromMeta.map(mapMetaCampaignToCampaignUpsert);

  const { campaignIdByMetaId, upserted: campaignsUpserted } = await upsertCampaigns({
    campaigns: campaignRows,
    logger,
    options,
  });

  const lookbackWindow = buildLookbackWindow(startedAtDate, lookbackDays);
  const spendRows: {
    campaignUuid: string;
    date: Date;
    amountCrc: number;
    impressions: number | null;
    clicks: number | null;
    cpc: number | null;
    ctr: number | null;
  }[] = [];

  let spendRowsRead = 0;
  let spendRowsSkippedCurrency = 0;

  for (const campaign of campaignsFromMeta) {
    const campaignUuid = campaignIdByMetaId.get(campaign.id);
    if (!campaignUuid) {
      logger.warn("[meta-sync] Missing local campaign UUID for Meta campaign", {
        metaCampaignId: campaign.id,
      });
      continue;
    }

    const insights = await api.listCampaignInsights({
      campaignId: campaign.id,
      since: lookbackWindow.since,
      until: lookbackWindow.until,
      pageSize: campaignSyncConfig.meta.insightsPageSize,
    });

    for (const insight of insights) {
      spendRowsRead += 1;
      const rowCurrency = insight.account_currency?.toUpperCase();

      if (rowCurrency && rowCurrency !== expectedAccountCurrency && !allowNonCrcAmount) {
        spendRowsSkippedCurrency += 1;
        logger.warn("[meta-sync] Skipping spend row due to unsupported currency", {
          campaignId: campaign.id,
          date: insight.date_start,
          currency: rowCurrency,
          expectedAccountCurrency,
        });
        continue;
      }

      try {
        spendRows.push(
          mapMetaInsightToCampaignSpendUpsert({
            campaignUuid,
            record: insight,
          }),
        );
      } catch (error) {
        logger.warn("[meta-sync] Skipping malformed insight row", {
          campaignId: campaign.id,
          date: insight.date_start,
          error: error instanceof Error ? error.message : "Unknown mapping error",
        });
      }
    }
  }

  const spendUpsert = await upsertCampaignSpend({
    spendRows,
    since: lookbackWindow.since,
    until: lookbackWindow.until,
    options,
  });

  const result: CampaignSyncResult = {
    skipped: false,
    intervalMinutes,
    lookbackDays,
    campaignsRead: campaignsFromMeta.length,
    campaignsUpserted,
    spendRowsRead,
    spendRowsInserted: spendUpsert.inserted,
    spendRowsUpdated: spendUpsert.updated,
    spendRowsSkippedCurrency,
    durationMs: Date.now() - startedAtMs,
    startedAt: startedAtDate.toISOString(),
    finishedAt: new Date().toISOString(),
  };

  logger.info("[meta-sync] Completed campaign sync", result);
  return result;
}

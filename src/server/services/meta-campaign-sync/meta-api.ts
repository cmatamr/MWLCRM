import { campaignSyncConfig } from "@/config/campaignSync";

import type { MetaCampaignApiRecord, MetaInsightApiRecord } from "./types";

type MetaApiListResponse<T> = {
  data: T[];
  paging?: {
    next?: string;
  };
  error?: {
    message?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

type MetaApiErrorPayload = {
  error?: {
    message?: string;
    code?: number;
    error_subcode?: number;
    type?: string;
    fbtrace_id?: string;
  };
};

export class MetaApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status = 500, payload?: unknown) {
    super(message);
    this.name = "MetaApiError";
    this.status = status;
    this.payload = payload;
  }
}

export interface MetaApiClientOptions {
  accessToken: string;
  adAccountId: string;
  apiVersion?: string;
  requestTimeoutMs?: number;
}

function normalizeAdAccountId(value: string): string {
  return value.startsWith("act_") ? value : `act_${value}`;
}

export class MetaApiClient {
  private readonly accessToken: string;
  private readonly adAccountId: string;
  private readonly apiVersion: string;
  private readonly requestTimeoutMs: number;

  constructor(options: MetaApiClientOptions) {
    this.accessToken = options.accessToken;
    this.adAccountId = normalizeAdAccountId(options.adAccountId);
    this.apiVersion = options.apiVersion ?? campaignSyncConfig.meta.apiVersion;
    this.requestTimeoutMs = options.requestTimeoutMs ?? campaignSyncConfig.meta.requestTimeoutMs;
  }

  async listCampaigns(pageSize = campaignSyncConfig.meta.campaignPageSize) {
    const fields = [
      "id",
      "name",
      "objective",
      "status",
      "effective_status",
      "start_time",
      "stop_time",
      "updated_time",
    ].join(",");

    const params = new URLSearchParams({
      fields,
      limit: String(pageSize),
      access_token: this.accessToken,
    });

    if (campaignSyncConfig.meta.relevantEffectiveStatuses.length > 0) {
      params.set(
        "effective_status",
        JSON.stringify(campaignSyncConfig.meta.relevantEffectiveStatuses),
      );
    }

    const url = `https://graph.facebook.com/${this.apiVersion}/${this.adAccountId}/campaigns?${params.toString()}`;

    return this.fetchAllPages<MetaCampaignApiRecord>(url);
  }

  async listCampaignInsights(input: {
    campaignId: string;
    since: string;
    until: string;
    pageSize?: number;
  }): Promise<MetaInsightApiRecord[]> {
    const fields = [
      "campaign_id",
      "date_start",
      "spend",
      "impressions",
      "clicks",
      "cpc",
      "ctr",
      "account_currency",
    ].join(",");

    const params = new URLSearchParams({
      fields,
      level: "campaign",
      time_increment: "1",
      limit: String(input.pageSize ?? campaignSyncConfig.meta.insightsPageSize),
      time_range: JSON.stringify({
        since: input.since,
        until: input.until,
      }),
      access_token: this.accessToken,
    });

    const url = `https://graph.facebook.com/${this.apiVersion}/${input.campaignId}/insights?${params.toString()}`;

    return this.fetchAllPages<MetaInsightApiRecord>(url);
  }

  private async fetchAllPages<T>(initialUrl: string): Promise<T[]> {
    const results: T[] = [];
    let nextUrl: string | undefined = initialUrl;

    while (nextUrl) {
      const pageResponse: MetaApiListResponse<T> = await this.fetchJson(nextUrl);

      if (pageResponse.error) {
        throw new MetaApiError(
          pageResponse.error.message ?? "Meta API error",
          502,
          pageResponse.error,
        );
      }

      results.push(...(pageResponse.data ?? []));
      nextUrl = pageResponse.paging?.next;
    }

    return results;
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: controller.signal,
      });

      const payload = (await response.json()) as T;

      if (!response.ok) {
        const typedPayload = payload as MetaApiErrorPayload;
        const metaErrorMessage = typedPayload?.error?.message;
        const metaErrorCode = typedPayload?.error?.code;
        const message = metaErrorMessage
          ? `Meta API request failed (${response.status}): ${metaErrorMessage}`
          : `Meta API request failed with status ${response.status}.`;

        throw new MetaApiError(
          metaErrorCode ? `${message} [code=${metaErrorCode}]` : message,
          response.status,
          payload,
        );
      }

      return payload;
    } catch (error) {
      if (error instanceof MetaApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new MetaApiError(`Meta API request timed out after ${this.requestTimeoutMs}ms.`, 504);
      }

      throw new MetaApiError("Meta API request failed.", 502, error);
    } finally {
      clearTimeout(timeout);
    }
  }
}

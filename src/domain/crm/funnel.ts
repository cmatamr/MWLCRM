import type { LeadStageType } from "@prisma/client";

export interface FunnelSummaryParams {
  campaignId?: string;
}

export interface FunnelObjectionSummary {
  key: string;
  objectionType: string;
  objectionSubtype: string | null;
  count: number;
  affectedLeadCount: number;
}

export interface FunnelStageSummary {
  stage: LeadStageType;
  threadCount: number;
  sharePercent: number;
  averageDurationHours: number;
  durationSampleSize: number;
  orderCount: number;
  revenueCrc: number;
  topObjections: FunnelObjectionSummary[];
}

export interface StalledConversationSummary {
  id: string;
  leadThreadKey: string;
  stage: LeadStageType;
  contactName: string | null;
  lastActivityAt: string;
  currentStageEnteredAt: string;
  currentStageAgeHours: number;
  averageStageDurationHours: number;
  objectionCount: number;
}

export interface FunnelSummary {
  generatedAt: string;
  hasData: boolean;
  totalLeads: number;
  activeLeads: number;
  wonLeads: number;
  lostLeads: number;
  totalRevenueCrc: number;
  totalObjections: number;
  uniqueObjectionTypes: number;
  stages: FunnelStageSummary[];
  topObjections: FunnelObjectionSummary[];
  stalledConversations: StalledConversationSummary[];
  stalledComparableCount: number;
}

import { LeadStageType } from "@prisma/client";

import {
  average,
  calculatePercentage,
  resolveDb,
  ServiceOptions,
} from "@/server/services/shared";

import type {
  FunnelObjectionSummary,
  FunnelStageSummary,
  FunnelSummary,
  StalledConversationSummary,
} from "./types";

const ORDERED_STAGES: LeadStageType[] = [
  LeadStageType.new,
  LeadStageType.qualified,
  LeadStageType.quote,
  LeadStageType.won,
  LeadStageType.lost,
];

const ACTIVE_STAGES = new Set<LeadStageType>([
  LeadStageType.new,
  LeadStageType.qualified,
  LeadStageType.quote,
]);

type ObjectionAccumulator = {
  objectionType: string;
  objectionSubtype: string | null;
  count: number;
  leadIds: Set<string>;
};

function isLeadStageType(stage: string): stage is LeadStageType {
  return ORDERED_STAGES.includes(stage as LeadStageType);
}

function createObjectionKey(type: string, subtype: string | null) {
  return `${type}::${subtype ?? ""}`;
}

function addObjectionCount(
  bucket: Map<string, ObjectionAccumulator>,
  input: {
    leadThreadId: string;
    objectionType: string;
    objectionSubtype: string | null;
  },
) {
  const key = createObjectionKey(input.objectionType, input.objectionSubtype);
  const current = bucket.get(key) ?? {
    objectionType: input.objectionType,
    objectionSubtype: input.objectionSubtype,
    count: 0,
    leadIds: new Set<string>(),
  };

  current.count += 1;
  current.leadIds.add(input.leadThreadId);
  bucket.set(key, current);
}

function mapObjectionSummary(bucket: Map<string, ObjectionAccumulator>): FunnelObjectionSummary[] {
  return [...bucket.entries()]
    .map(([key, value]) => ({
      key,
      objectionType: value.objectionType,
      objectionSubtype: value.objectionSubtype,
      count: value.count,
      affectedLeadCount: value.leadIds.size,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.key.localeCompare(right.key);
    });
}

function resolveLastActivityAt(input: {
  updatedAt: Date;
  createdAt: Date;
  lastCustomerTs: Date | null;
  lastHumanTs: Date | null;
  lastAiTs: Date | null;
}) {
  const dates = [
    input.updatedAt,
    input.createdAt,
    input.lastCustomerTs,
    input.lastHumanTs,
    input.lastAiTs,
  ].filter((value): value is Date => value instanceof Date);

  return dates.sort((left, right) => right.getTime() - left.getTime())[0] ?? input.updatedAt;
}

export async function getFunnelSummary(options?: ServiceOptions): Promise<FunnelSummary> {
  const db = resolveDb(options);
  const now = new Date();

  const [threads, stageHistory, objections, orders] = await db.$transaction([
    db.leadThread.findMany({
      select: {
        id: true,
        leadThreadKey: true,
        leadStage: true,
        createdAt: true,
        updatedAt: true,
        lastCustomerTs: true,
        lastHumanTs: true,
        lastAiTs: true,
        contact: {
          select: {
            displayName: true,
          },
        },
      },
    }),
    db.funnelStageHistory.findMany({
      select: {
        leadThreadId: true,
        stage: true,
        enteredAt: true,
        exitedAt: true,
        durationSeconds: true,
      },
    }),
    db.conversationObjection.findMany({
      select: {
        leadThreadId: true,
        objectionType: true,
        objectionSubtype: true,
      },
    }),
    db.order.findMany({
      select: {
        totalCrc: true,
        leadThread: {
          select: {
            leadStage: true,
          },
        },
      },
    }),
  ]);

  const threadMap = new Map(threads.map((thread) => [thread.id, thread]));
  const stageCountMap = new Map<string, number>();
  for (const thread of threads) {
    stageCountMap.set(thread.leadStage, (stageCountMap.get(thread.leadStage) ?? 0) + 1);
  }

  const stageDurationsMap = new Map<string, number[]>();
  const latestCurrentStageEntryMap = new Map<string, Date>();
  for (const historyItem of stageHistory) {
    if (
      historyItem.leadThreadId &&
      isLeadStageType(historyItem.stage) &&
      threadMap.get(historyItem.leadThreadId)?.leadStage === historyItem.stage
    ) {
      const previous = latestCurrentStageEntryMap.get(historyItem.leadThreadId);
      if (!previous || historyItem.enteredAt > previous) {
        latestCurrentStageEntryMap.set(historyItem.leadThreadId, historyItem.enteredAt);
      }
    }

    if (historyItem.durationSeconds == null) {
      continue;
    }

    if (!isLeadStageType(historyItem.stage)) {
      continue;
    }

    const bucket = stageDurationsMap.get(historyItem.stage) ?? [];
    bucket.push(historyItem.durationSeconds / 3600);
    stageDurationsMap.set(historyItem.stage, bucket);
  }

  const orderMetricsMap = new Map<string, { orderCount: number; revenueCrc: number }>();
  for (const order of orders) {
    const stage = order.leadThread.leadStage;
    const current = orderMetricsMap.get(stage) ?? { orderCount: 0, revenueCrc: 0 };
    current.orderCount += 1;
    current.revenueCrc += order.totalCrc;
    orderMetricsMap.set(stage, current);
  }

  const globalObjectionMap = new Map<string, ObjectionAccumulator>();
  const stageObjectionMap = new Map<LeadStageType, Map<string, ObjectionAccumulator>>();
  const objectionCountByThread = new Map<string, number>();

  for (const objection of objections) {
    if (!objection.leadThreadId) {
      continue;
    }

    const thread = threadMap.get(objection.leadThreadId);
    if (!thread) {
      continue;
    }

    addObjectionCount(globalObjectionMap, {
      leadThreadId: objection.leadThreadId,
      objectionType: objection.objectionType,
      objectionSubtype: objection.objectionSubtype,
    });

    const stageBucket = stageObjectionMap.get(thread.leadStage) ?? new Map<string, ObjectionAccumulator>();
    addObjectionCount(stageBucket, {
      leadThreadId: objection.leadThreadId,
      objectionType: objection.objectionType,
      objectionSubtype: objection.objectionSubtype,
    });
    stageObjectionMap.set(thread.leadStage, stageBucket);

    objectionCountByThread.set(
      objection.leadThreadId,
      (objectionCountByThread.get(objection.leadThreadId) ?? 0) + 1,
    );
  }

  const totalLeads = threads.length;
  const wonLeads = stageCountMap.get(LeadStageType.won) ?? 0;
  const lostLeads = stageCountMap.get(LeadStageType.lost) ?? 0;
  const activeLeads = totalLeads - wonLeads - lostLeads;
  const totalRevenueCrc = orders.reduce((sum, order) => sum + order.totalCrc, 0);
  const averageDurationByStage = new Map<LeadStageType, number>(
    ORDERED_STAGES.map((stage) => [stage, average(stageDurationsMap.get(stage) ?? [])]),
  );

  const stages: FunnelStageSummary[] = ORDERED_STAGES.map((stage) => ({
      stage,
      threadCount: stageCountMap.get(stage) ?? 0,
      sharePercent: calculatePercentage(stageCountMap.get(stage) ?? 0, totalLeads),
      averageDurationHours: averageDurationByStage.get(stage) ?? 0,
      durationSampleSize: stageDurationsMap.get(stage)?.length ?? 0,
      orderCount: orderMetricsMap.get(stage)?.orderCount ?? 0,
      revenueCrc: orderMetricsMap.get(stage)?.revenueCrc ?? 0,
      topObjections: mapObjectionSummary(stageObjectionMap.get(stage) ?? new Map()).slice(0, 3),
    }));

  const stalledCandidates: StalledConversationSummary[] = [];
  let stalledComparableCount = 0;

  for (const thread of threads) {
    if (!ACTIVE_STAGES.has(thread.leadStage)) {
      continue;
    }

    const currentStageEnteredAt = latestCurrentStageEntryMap.get(thread.id);
    const averageStageDurationHours = averageDurationByStage.get(thread.leadStage) ?? 0;

    if (!currentStageEnteredAt || averageStageDurationHours <= 0) {
      continue;
    }

    stalledComparableCount += 1;
    const currentStageAgeHours =
      (now.getTime() - currentStageEnteredAt.getTime()) / (1000 * 60 * 60);

    if (currentStageAgeHours <= averageStageDurationHours) {
      continue;
    }

    stalledCandidates.push({
      id: thread.id,
      leadThreadKey: thread.leadThreadKey,
      stage: thread.leadStage,
      contactName: thread.contact?.displayName ?? null,
      lastActivityAt: resolveLastActivityAt(thread).toISOString(),
      currentStageEnteredAt: currentStageEnteredAt.toISOString(),
      currentStageAgeHours: Number(currentStageAgeHours.toFixed(2)),
      averageStageDurationHours: averageStageDurationHours,
      objectionCount: objectionCountByThread.get(thread.id) ?? 0,
    });
  }

  stalledCandidates.sort((left, right) => {
    const rightGap = right.currentStageAgeHours - right.averageStageDurationHours;
    const leftGap = left.currentStageAgeHours - left.averageStageDurationHours;
    return rightGap - leftGap;
  });

  return {
    generatedAt: now.toISOString(),
    hasData: totalLeads > 0 || objections.length > 0 || stageHistory.length > 0,
    totalLeads,
    activeLeads,
    wonLeads,
    lostLeads,
    totalRevenueCrc,
    stages,
    totalObjections: objections.length,
    uniqueObjectionTypes: globalObjectionMap.size,
    topObjections: mapObjectionSummary(globalObjectionMap).slice(0, 6),
    stalledConversations: stalledCandidates.slice(0, 12),
    stalledComparableCount,
  };
}

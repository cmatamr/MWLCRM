import type {
  Contact,
  ConversationObjection,
  FunnelStageHistory,
  LeadThread,
  Message,
} from "@prisma/client";

import {
  mapCustomerReference,
  mapCustomerReferenceWithExternalId,
  resolveLastInteractionAt,
} from "@/domain/crm/mappers";
import { toNullableIsoDate, toNumber } from "@/server/services/shared";

import type {
  ConversationDetail,
  ConversationListItem,
  ConversationMessage,
  ConversationObjectionItem,
  ConversationStateChangeItem,
} from "./types";

type ConversationListRecord = Pick<
  LeadThread,
  | "id"
  | "leadThreadKey"
  | "channel"
  | "leadStage"
  | "owner"
  | "updatedAt"
  | "lastCustomerTs"
  | "lastHumanTs"
  | "lastAiTs"
> & {
  contact: Pick<Contact, "id" | "displayName"> | null;
  messages: Pick<Message, "text" | "createdAt">[];
  conversationObjections: Pick<ConversationObjection, "objectionType" | "createdAt">[];
  _count: {
    messages: number;
    conversationObjections: number;
  };
};

type ConversationDetailRecord = Pick<
  LeadThread,
  | "id"
  | "leadThreadKey"
  | "channel"
  | "leadStage"
  | "owner"
  | "mode"
  | "leadScore"
  | "updatedAt"
  | "lastCustomerTs"
  | "lastHumanTs"
  | "lastAiTs"
> & {
  contact: Pick<Contact, "id" | "displayName" | "externalId"> | null;
  messages: Pick<
    Message,
    "id" | "senderType" | "provider" | "text" | "attachments" | "createdAt" | "receivedTs"
  >[];
  conversationObjections: Array<
    Pick<
      ConversationObjection,
      | "id"
      | "objectionType"
      | "objectionSubtype"
      | "detectedFrom"
      | "confidence"
      | "createdAt"
      | "resolvedAt"
    > & {
      message: Pick<Message, "text"> | null;
    }
  >;
  funnelStageHistory: Pick<
    FunnelStageHistory,
    "id" | "stage" | "enteredAt" | "exitedAt" | "durationSeconds" | "reason"
  >[];
  _count: {
    messages: number;
    conversationObjections: number;
    funnelStageHistory: number;
  };
};

function mapObjectionSummary(
  objections: ConversationListRecord["conversationObjections"],
): string[] {
  const labels = objections.map((objection) => objection.objectionType.trim()).filter(Boolean);
  return [...new Set(labels)].slice(0, 3);
}

function getAttachmentCount(attachments: unknown): number {
  return Array.isArray(attachments) ? attachments.length : 0;
}

export function mapConversationListItem(thread: ConversationListRecord): ConversationListItem {
  return {
    id: thread.id,
    leadThreadKey: thread.leadThreadKey,
    channel: thread.channel,
    leadStage: thread.leadStage,
    owner: thread.owner,
    lastInteractionAt: resolveLastInteractionAt(thread),
    contact: mapCustomerReference({
      id: thread.contact?.id,
      name: thread.contact?.displayName,
    }),
    lastMessagePreview: thread.messages[0]?.text ?? null,
    totalMessages: thread._count.messages,
    objections: mapObjectionSummary(thread.conversationObjections),
    objectionCount: thread._count.conversationObjections,
  };
}

function mapConversationMessage(message: ConversationDetailRecord["messages"][number]): ConversationMessage {
  return {
    id: message.id,
    senderType: message.senderType,
    provider: message.provider,
    text: message.text ?? null,
    attachmentCount: getAttachmentCount(message.attachments),
    createdAt: message.createdAt.toISOString(),
    receivedAt: message.receivedTs.toISOString(),
  };
}

function mapConversationObjection(
  objection: ConversationDetailRecord["conversationObjections"][number],
): ConversationObjectionItem {
  return {
    id: objection.id,
    objectionType: objection.objectionType,
    objectionSubtype: objection.objectionSubtype ?? null,
    detectedFrom: objection.detectedFrom ?? null,
    confidence: objection.confidence == null ? null : toNumber(objection.confidence),
    createdAt: objection.createdAt?.toISOString() ?? new Date(0).toISOString(),
    resolvedAt: toNullableIsoDate(objection.resolvedAt),
    messagePreview: objection.message?.text ?? null,
  };
}

function mapConversationStateChange(
  change: ConversationDetailRecord["funnelStageHistory"][number],
): ConversationStateChangeItem {
  return {
    id: change.id,
    stage: change.stage,
    enteredAt: change.enteredAt.toISOString(),
    exitedAt: toNullableIsoDate(change.exitedAt),
    durationSeconds: change.durationSeconds ?? null,
    reason: change.reason ?? null,
  };
}

export function mapConversationDetail(thread: ConversationDetailRecord): ConversationDetail {
  const objections = thread.conversationObjections.map(mapConversationObjection);

  return {
    id: thread.id,
    leadThreadKey: thread.leadThreadKey,
    channel: thread.channel,
    leadStage: thread.leadStage,
    owner: thread.owner,
    mode: thread.mode,
    leadScore: thread.leadScore,
    lastInteractionAt: resolveLastInteractionAt(thread),
    contact: mapCustomerReferenceWithExternalId({
      id: thread.contact?.id,
      name: thread.contact?.displayName,
      externalId: thread.contact?.externalId,
    }),
    metrics: {
      totalMessages: thread._count.messages,
      objectionCount: thread._count.conversationObjections,
      openObjectionCount: objections.filter((objection) => !objection.resolvedAt).length,
      stateChangeCount: thread._count.funnelStageHistory,
    },
    lastMessagePreview: thread.messages[0]?.text ?? null,
    messages: [...thread.messages].reverse().map(mapConversationMessage),
    objections,
    stateChanges: thread.funnelStageHistory.map(mapConversationStateChange),
  };
}

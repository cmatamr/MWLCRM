import type {
  ChannelType,
  LeadStageType,
  ProviderType,
  SenderType,
} from "@prisma/client";

import type {
  CustomerReference,
  CustomerReferenceWithExternalId,
  PagedResponse,
  PaginationParams,
} from "./common";

export interface ListConversationsParams extends PaginationParams {
  search?: string;
  stage?: LeadStageType;
  owner?: string;
}

export interface ConversationListItem {
  id: string;
  leadThreadKey: string;
  channel: ChannelType;
  leadStage: LeadStageType;
  owner: string;
  lastInteractionAt: string;
  contact: CustomerReference;
  lastMessagePreview: string | null;
  totalMessages: number;
  objections: string[];
  objectionCount: number;
}

export type ConversationsListResponse = PagedResponse<ConversationListItem>;

export interface ConversationMessage {
  id: string;
  senderType: SenderType;
  provider: ProviderType;
  text: string | null;
  attachmentCount: number;
  createdAt: string;
  receivedAt: string;
}

export interface ConversationObjectionItem {
  id: string;
  objectionType: string;
  objectionSubtype: string | null;
  detectedFrom: string | null;
  confidence: number | null;
  createdAt: string;
  resolvedAt: string | null;
  messagePreview: string | null;
}

export interface ConversationStateChangeItem {
  id: string;
  stage: string;
  enteredAt: string;
  exitedAt: string | null;
  durationSeconds: number | null;
  reason: string | null;
}

export interface ConversationDetail {
  id: string;
  leadThreadKey: string;
  channel: ChannelType;
  leadStage: LeadStageType;
  owner: string;
  mode: string;
  leadScore: number;
  lastInteractionAt: string;
  contact: CustomerReferenceWithExternalId;
  metrics: {
    totalMessages: number;
    objectionCount: number;
    openObjectionCount: number;
    stateChangeCount: number;
  };
  lastMessagePreview: string | null;
  messages: ConversationMessage[];
  objections: ConversationObjectionItem[];
  stateChanges: ConversationStateChangeItem[];
}

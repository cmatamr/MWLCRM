import type { LeadStageType } from "@prisma/client";

import type {
  ConversationReference,
  CustomerReference,
  CustomerReferenceWithExternalId,
} from "./common";

export function mapCustomerReference(input: {
  id?: string | null;
  name?: string | null;
}): CustomerReference {
  return {
    id: input.id ?? null,
    name: input.name ?? null,
  };
}

export function mapCustomerReferenceWithExternalId(input: {
  id?: string | null;
  name?: string | null;
  externalId?: string | null;
}): CustomerReferenceWithExternalId {
  return {
    ...mapCustomerReference(input),
    externalId: input.externalId ?? null,
  };
}

export function mapConversationReference(input: {
  id: string;
  leadThreadKey: string;
}): ConversationReference {
  return {
    id: input.id,
    leadThreadKey: input.leadThreadKey,
  };
}

export function mapConversationStageReference(input: {
  id: string;
  leadThreadKey: string;
  leadStage: LeadStageType;
}): ConversationReference & { leadStage: LeadStageType } {
  return {
    ...mapConversationReference(input),
    leadStage: input.leadStage,
  };
}

export function mapCustomerTags(tags: unknown): string[] {
  if (Array.isArray(tags)) {
    return tags.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  }

  if (!tags || typeof tags !== "object") {
    return [];
  }

  return Object.entries(tags)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key);
}

export function resolveLastInteractionAt(input: {
  updatedAt: Date;
  lastCustomerTs: Date | null;
  lastHumanTs: Date | null;
  lastAiTs: Date | null;
}): string {
  const timestamps = [
    input.updatedAt,
    input.lastCustomerTs,
    input.lastHumanTs,
    input.lastAiTs,
  ].filter((value): value is Date => value instanceof Date);

  return timestamps.reduce((latest, current) =>
    current.getTime() > latest.getTime() ? current : latest,
  ).toISOString();
}

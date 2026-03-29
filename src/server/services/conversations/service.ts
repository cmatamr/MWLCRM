import { Prisma } from "@prisma/client";

import {
  createPaginationMeta,
  isUuid,
  normalizePagination,
  resolveDb,
  ServiceOptions,
} from "@/server/services/shared";

import { mapConversationDetail, mapConversationListItem } from "./mappers";
import type {
  ConversationDetail,
  ConversationsListResponse,
  ListConversationsParams,
} from "./types";

function buildConversationWhere(
  params: ListConversationsParams,
): Prisma.LeadThreadWhereInput {
  const search = params.search?.trim();

  return {
    ...(params.stage ? { leadStage: params.stage } : {}),
    ...(params.owner ? { owner: params.owner } : {}),
    ...(search
      ? {
          OR: [
            ...(isUuid(search)
              ? [
                  {
                    id: {
                      equals: search,
                    },
                  },
                ]
              : []),
            {
              leadThreadKey: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              contact: {
                is: {
                  displayName: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              contact: {
                is: {
                  externalId: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        }
      : {}),
  };
}

export async function listConversations(
  params: ListConversationsParams = {},
  options?: ServiceOptions,
): Promise<ConversationsListResponse> {
  const db = resolveDb(options);
  const pagination = normalizePagination(params);
  const where = buildConversationWhere(params);

  const [total, threads] = await db.$transaction([
    db.leadThread.count({ where }),
    db.leadThread.findMany({
      where,
      orderBy: {
        updatedAt: "desc",
      },
      skip: pagination.skip,
      take: pagination.take,
      select: {
        id: true,
        leadThreadKey: true,
        channel: true,
        leadStage: true,
        owner: true,
        updatedAt: true,
        lastCustomerTs: true,
        lastHumanTs: true,
        lastAiTs: true,
        contact: {
          select: {
            id: true,
            displayName: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            text: true,
            createdAt: true,
          },
        },
        conversationObjections: {
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
          select: {
            objectionType: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            messages: true,
            conversationObjections: true,
          },
        },
      },
    }),
  ]);

  return {
    items: threads.map(mapConversationListItem),
    pagination: createPaginationMeta({
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    }),
  };
}

export async function getConversationDetail(
  conversationId: string,
  options?: ServiceOptions,
): Promise<ConversationDetail | null> {
  const db = resolveDb(options);

  const thread = await db.leadThread.findUnique({
    where: {
      id: conversationId,
    },
    select: {
      id: true,
      leadThreadKey: true,
      channel: true,
      leadStage: true,
      owner: true,
      mode: true,
      leadScore: true,
      updatedAt: true,
      lastCustomerTs: true,
      lastHumanTs: true,
      lastAiTs: true,
      contact: {
        select: {
          id: true,
          displayName: true,
          externalId: true,
        },
      },
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
        select: {
          id: true,
          senderType: true,
          provider: true,
          text: true,
          attachments: true,
          createdAt: true,
          receivedTs: true,
        },
      },
      conversationObjections: {
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
        select: {
          id: true,
          objectionType: true,
          objectionSubtype: true,
          detectedFrom: true,
          confidence: true,
          createdAt: true,
          resolvedAt: true,
          message: {
            select: {
              text: true,
            },
          },
        },
      },
      funnelStageHistory: {
        orderBy: {
          enteredAt: "desc",
        },
        take: 20,
        select: {
          id: true,
          stage: true,
          enteredAt: true,
          exitedAt: true,
          durationSeconds: true,
          reason: true,
        },
      },
      _count: {
        select: {
          messages: true,
          conversationObjections: true,
          funnelStageHistory: true,
        },
      },
    },
  });

  return thread ? mapConversationDetail(thread) : null;
}

import { Prisma } from "@prisma/client";

import { normalizeCustomerExternalIdForStorage } from "@/domain/crm/customer-edit";
import { logError, logWarn } from "@/server/observability/logger";
import {
  createPaginationMeta,
  normalizePagination,
  resolveDb,
  ServiceOptions,
} from "@/server/services/shared";

import { mapCustomerDetail, mapCustomerListItem, mapCustomerMetrics } from "./mappers";
import type {
  CreateCustomerInput,
  CustomerDetail,
  CustomerListItem,
  CustomersListResponse,
  ListCustomersParams,
  UpdateCustomerInput,
} from "./types";

export class CreateCustomerError extends Error {
  code: "DUPLICATE_CUSTOMER";

  constructor(
    code: CreateCustomerError["code"],
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "CreateCustomerError";
    this.code = code;
  }
}

export class UpdateCustomerError extends Error {
  code: "DUPLICATE_CUSTOMER" | "INVALID_EXTERNAL_ID" | "INVALID_DISPLAY_NAME";

  constructor(
    code: UpdateCustomerError["code"],
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "UpdateCustomerError";
    this.code = code;
  }
}

function resolvePrismaErrorMetadata(error: unknown): {
  prismaCode: string | null;
  prismaClientVersion: string | null;
} {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return {
      prismaCode: error.code,
      prismaClientVersion: error.clientVersion ?? null,
    };
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return {
      prismaCode: null,
      prismaClientVersion: error.clientVersion ?? null,
    };
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      prismaCode: error.errorCode ?? null,
      prismaClientVersion: error.clientVersion ?? null,
    };
  }

  return {
    prismaCode: null,
    prismaClientVersion: null,
  };
}

function buildCustomerWhere(params: ListCustomersParams): Prisma.ContactWhereInput {
  const search = params.search?.trim();

  return {
    ...(params.status ? { customerStatus: params.status } : {}),
    ...(params.channel ? { primaryChannel: params.channel } : {}),
    ...(search
      ? {
          OR: [
            {
              displayName: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              externalId: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };
}

function buildCustomerOrderBy(
  sort: ListCustomersParams["sort"],
): Prisma.ContactOrderByWithRelationInput {
  switch (sort) {
    case "name":
      return { displayName: "asc" };
    case "recent":
    default:
      return { updatedAt: "desc" };
  }
}

async function getOrderMetricsByContactId(
  contactIds: string[],
  options?: ServiceOptions,
): Promise<Map<string, { totalOrders: number; totalSpentCrc: number; lastOrderAt: Date | null }>> {
  if (contactIds.length === 0) {
    return new Map();
  }

  const db = resolveDb(options);
  const groupedOrders = await db.order.groupBy({
    by: ["contactId"],
    where: {
      contactId: {
        in: contactIds,
      },
    },
    _count: {
      _all: true,
    },
    _sum: {
      totalCrc: true,
    },
    _max: {
      createdAt: true,
    },
  });

  return new Map(
    groupedOrders
      .filter((group): group is typeof group & { contactId: string } => Boolean(group.contactId))
      .map((group) => [
        group.contactId,
        {
          totalOrders: group._count._all,
          totalSpentCrc: group._sum.totalCrc ?? 0,
          lastOrderAt: group._max.createdAt ?? null,
        },
      ]),
  );
}

export async function listCustomers(
  params: ListCustomersParams = {},
  options?: ServiceOptions,
): Promise<CustomersListResponse> {
  const db = resolveDb(options);
  const pagination = normalizePagination(params);
  const where = buildCustomerWhere(params);
  const usesAggregateSort =
    params.sort === "highest_spent" || params.sort === "most_orders";

  const [total, contacts] = await db.$transaction(async (tx) => {
    const totalContacts = await tx.contact.count({ where });
    const records = await tx.contact.findMany({
      where,
      orderBy: buildCustomerOrderBy(params.sort),
      ...(usesAggregateSort
        ? {}
        : {
            skip: pagination.skip,
            take: pagination.take,
          }),
      select: {
        id: true,
        displayName: true,
        externalId: true,
        primaryChannel: true,
        customerStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return [totalContacts, records] as const;
  });

  const orderMetricsByContactId = await getOrderMetricsByContactId(
    contacts.map((contact) => contact.id),
    options,
  );

  const items = contacts
    .map((contact) => ({
      contact,
      metrics: mapCustomerMetrics(orderMetricsByContactId.get(contact.id)),
    }))
    .sort((left, right) => {
      switch (params.sort) {
        case "highest_spent":
          return (
            right.metrics.totalSpentCrc - left.metrics.totalSpentCrc ||
            right.contact.updatedAt.getTime() - left.contact.updatedAt.getTime()
          );
        case "most_orders":
          return (
            right.metrics.totalOrders - left.metrics.totalOrders ||
            right.contact.updatedAt.getTime() - left.contact.updatedAt.getTime()
          );
        case "name":
          return (left.contact.displayName ?? "").localeCompare(right.contact.displayName ?? "", "es");
        case "recent":
        default:
          return right.contact.updatedAt.getTime() - left.contact.updatedAt.getTime();
      }
    })
    .slice(
      usesAggregateSort ? pagination.skip : 0,
      usesAggregateSort ? pagination.skip + pagination.take : undefined,
    )
    .map(({ contact, metrics }) => mapCustomerListItem(contact, metrics));

  return {
    items,
    pagination: createPaginationMeta({
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    }),
  };
}

export async function getCustomerDetail(
  customerId: string,
  options?: ServiceOptions,
): Promise<CustomerDetail | null> {
  const db = resolveDb(options);

  const contact = await db.contact.findUnique({
    where: {
      id: customerId,
    },
    select: {
      id: true,
      displayName: true,
      externalId: true,
      primaryChannel: true,
      customerStatus: true,
      createdAt: true,
      updatedAt: true,
      tags: true,
    },
  });

  if (!contact) {
    return null;
  }

  const [orders, conversations, orderMetricsByContactId] = await Promise.all([
    db.order.findMany({
      where: {
        contactId: customerId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
      select: {
        id: true,
        status: true,
        totalCrc: true,
        createdAt: true,
      },
    }),
    db.leadThread.findMany({
      where: {
        contactId: customerId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 10,
      select: {
        id: true,
        leadThreadKey: true,
        leadStage: true,
        updatedAt: true,
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            text: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    }),
    getOrderMetricsByContactId([customerId], options),
  ]);

  return mapCustomerDetail({
    contact,
    metrics: mapCustomerMetrics(orderMetricsByContactId.get(customerId)),
    orders,
    conversations,
  });
}

export async function createCustomer(
  input: CreateCustomerInput,
  options?: ServiceOptions,
): Promise<CustomerListItem> {
  const db = resolveDb(options);

  try {
    const contact = await db.contact.create({
      data: {
        primaryChannel: input.primaryChannel,
        externalId: input.externalId.trim(),
        displayName: input.displayName.trim(),
        customerStatus: input.customerStatus?.trim() || null,
      },
      select: {
        id: true,
        displayName: true,
        externalId: true,
        primaryChannel: true,
        customerStatus: true,
        createdAt: true,
      },
    });

    return mapCustomerListItem(contact, mapCustomerMetrics());
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const { prismaCode, prismaClientVersion } = resolvePrismaErrorMetadata(error);
      await logWarn({
        source: "service.customers",
        eventType: "customers_api_error",
        message: "Duplicate customer detected during createCustomer.",
        errorMessage: error.message,
        metadata: {
          operation: "create_customer",
          errorStage: "create_customer_insert",
          errorName: error.name,
          errorCode: error.code,
          primaryChannel: input.primaryChannel,
          prismaCode,
          prismaClientVersion,
          environment: process.env.VERCEL_ENV?.trim() || process.env.NODE_ENV?.trim() || "unknown",
        },
      });

      throw new CreateCustomerError(
        "DUPLICATE_CUSTOMER",
        "Ya existe un customer con ese canal e identificador externo.",
        {
          primaryChannel: input.primaryChannel,
          externalId: input.externalId.trim(),
        },
      );
    }

    const { prismaCode, prismaClientVersion } = resolvePrismaErrorMetadata(error);
    await logError({
      source: "service.customers",
      eventType: "customers_api_error",
      message: "createCustomer failed with unexpected error.",
      errorMessage: error instanceof Error ? error.message : "Unknown customer service error",
      stackTrace: error instanceof Error ? error.stack : null,
      metadata: {
        operation: "create_customer",
        errorStage: "create_customer_insert",
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorCode:
          error instanceof Prisma.PrismaClientKnownRequestError
            ? error.code
            : null,
        primaryChannel: input.primaryChannel,
        prismaCode,
        prismaClientVersion,
        environment: process.env.VERCEL_ENV?.trim() || process.env.NODE_ENV?.trim() || "unknown",
      },
    });

    throw error;
  }
}

export async function updateCustomer(
  customerId: string,
  input: UpdateCustomerInput,
  options?: ServiceOptions,
): Promise<CustomerDetail | null> {
  const db = resolveDb(options);
  const existingContact = await db.contact.findUnique({
    where: {
      id: customerId,
    },
    select: {
      id: true,
      primaryChannel: true,
    },
  });

  if (!existingContact) {
    return null;
  }

  const normalizedExternalId = normalizeCustomerExternalIdForStorage(
    input.externalId,
    existingContact.primaryChannel,
  );

  if (!normalizedExternalId) {
    throw new UpdateCustomerError(
      "INVALID_EXTERNAL_ID",
      existingContact.primaryChannel === "wa"
        ? "El teléfono de WhatsApp debe tener exactamente 8 dígitos locales."
        : "El identificador externo es obligatorio.",
      {
        primaryChannel: existingContact.primaryChannel,
      },
    );
  }

  if (!input.displayName || input.displayName.trim().length === 0) {
    throw new UpdateCustomerError(
      "INVALID_DISPLAY_NAME",
      "display_name is required",
    );
  }

  try {
    await db.contact.update({
      where: {
        id: customerId,
      },
      data: {
        externalId: normalizedExternalId,
        displayName: input.displayName.trim(),
        customerStatus: input.customerStatus?.trim() || null,
      },
      select: {
        id: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const { prismaCode, prismaClientVersion } = resolvePrismaErrorMetadata(error);
      await logWarn({
        source: "service.customers",
        eventType: "customers_api_error",
        message: "Duplicate customer detected during updateCustomer.",
        errorMessage: error.message,
        metadata: {
          operation: "update_customer",
          errorStage: "update_customer_update",
          errorName: error.name,
          errorCode: error.code,
          customerId,
          primaryChannel: existingContact.primaryChannel,
          prismaCode,
          prismaClientVersion,
          environment: process.env.VERCEL_ENV?.trim() || process.env.NODE_ENV?.trim() || "unknown",
        },
      });

      throw new UpdateCustomerError(
        "DUPLICATE_CUSTOMER",
        "Ya existe un customer con ese canal e identificador externo.",
        {
          primaryChannel: existingContact.primaryChannel,
          externalId: normalizedExternalId,
        },
      );
    }

    const { prismaCode, prismaClientVersion } = resolvePrismaErrorMetadata(error);
    await logError({
      source: "service.customers",
      eventType: "customers_api_error",
      message: "updateCustomer failed with unexpected error.",
      errorMessage: error instanceof Error ? error.message : "Unknown customer service error",
      stackTrace: error instanceof Error ? error.stack : null,
      metadata: {
        operation: "update_customer",
        errorStage: "update_customer_update",
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorCode:
          error instanceof Prisma.PrismaClientKnownRequestError
            ? error.code
            : null,
        customerId,
        primaryChannel: existingContact.primaryChannel,
        prismaCode,
        prismaClientVersion,
        environment: process.env.VERCEL_ENV?.trim() || process.env.NODE_ENV?.trim() || "unknown",
      },
    });

    throw error;
  }

  return getCustomerDetail(customerId, options);
}

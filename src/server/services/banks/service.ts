import type { Bank } from "@prisma/client";

import type { BankListItem } from "@/domain/crm/banks";
import { resolveDb, type ServiceOptions } from "@/server/services/shared";

function mapBankListItem(bank: Pick<Bank, "id" | "name" | "code" | "isActive" | "createdAt">): BankListItem {
  return {
    id: bank.id,
    name: bank.name,
    code: bank.code,
    isActive: bank.isActive,
    createdAt: bank.createdAt.toISOString(),
  };
}

export async function listActiveBanks(options?: ServiceOptions): Promise<BankListItem[]> {
  const db = resolveDb(options);

  const banks = await db.bank.findMany({
    where: {
      isActive: true,
    },
    orderBy: [
      { name: "asc" },
      { createdAt: "asc" },
    ],
    select: {
      id: true,
      name: true,
      code: true,
      isActive: true,
      createdAt: true,
    },
  });

  return banks.map(mapBankListItem);
}

import { mapCustomerTags } from "@/domain/crm/mappers";
import {
  formatChannelLabel,
  formatCustomerDisplayName,
  formatCustomerStatusLabel,
  formatLeadStageLabel,
  formatOrderStatusLabel,
  getCustomerStatusBadge,
  getLeadStageBadge,
  getOrderStatusBadge,
  getStatusBadgeClassName,
} from "@/domain/crm/formatters";

export {
  formatChannelLabel,
  formatCustomerStatusLabel,
  formatLeadStageLabel,
  formatOrderStatusLabel,
  getCustomerStatusBadge,
  getLeadStageBadge,
  getOrderStatusBadge,
  getStatusBadgeClassName,
};

export function getCustomerDisplayName(displayName: string | null) {
  return formatCustomerDisplayName(displayName);
}

export function getCustomerInitials(displayName: string | null, externalId: string) {
  const safeName = displayName?.trim();

  if (!safeName) {
    return externalId.slice(0, 2).toUpperCase();
  }

  return safeName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function extractTagLabels(tags: unknown): string[] {
  return mapCustomerTags(tags);
}

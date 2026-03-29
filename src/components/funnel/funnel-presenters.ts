export {
  formatDurationHours,
  formatLeadStageLabel as formatStageLabel,
} from "@/domain/crm/formatters";

import { formatObjectionLabel as formatSharedObjectionLabel } from "@/domain/crm/formatters";
import type { FunnelObjectionSummary } from "@/server/services/funnel/types";

export function formatObjectionLabel(
  objection: Pick<FunnelObjectionSummary, "objectionType" | "objectionSubtype">,
) {
  return formatSharedObjectionLabel(objection.objectionType, objection.objectionSubtype);
}

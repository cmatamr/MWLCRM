import type {
  ChannelType,
  LeadStageType,
  OrderStatusEnum,
  SenderType,
} from "@prisma/client";

import type { BadgeTone, StatusBadgeViewModel } from "./common";

const crcCurrencyFormatter = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-CR", {
  dateStyle: "medium",
  timeStyle: "short",
});

const dateFormatter = new Intl.DateTimeFormat("es-CR", {
  dateStyle: "medium",
});

const shortDateFormatter = new Intl.DateTimeFormat("es-CR", {
  month: "short",
  day: "numeric",
});

const channelLabels: Record<ChannelType, string> = {
  wa: "WhatsApp",
  ig: "Instagram",
  fb: "Facebook",
};

const leadStageLabels: Record<LeadStageType, string> = {
  new: "Nuevo",
  qualified: "Calificado",
  quote: "Cotizacion",
  won: "Ganado",
  lost: "Perdido",
};

const senderLabels: Record<SenderType, string> = {
  customer: "Cliente",
  human: "Asesor",
  agent: "IA",
  system: "Sistema",
};

const leadStageTones: Record<LeadStageType, BadgeTone> = {
  new: "info",
  qualified: "warning",
  quote: "warning",
  won: "success",
  lost: "danger",
};

const orderStatusTones: Partial<Record<OrderStatusEnum, BadgeTone>> = {
  draft: "neutral",
  quoted: "info",
  pending_payment: "warning",
  payment_review: "warning",
  confirmed: "info",
  in_design: "info",
  in_production: "warning",
  ready: "success",
  shipped: "info",
  completed: "success",
  cancelled: "danger",
};

function humanizeToken(value: string) {
  return value
    .replaceAll("_", " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function createBadge(label: string, tone: BadgeTone): StatusBadgeViewModel {
  return {
    label,
    tone,
  };
}

export function formatCurrencyCRC(value: number) {
  return crcCurrencyFormatter.format(value);
}

export function formatDateTime(value: Date | string | number) {
  return dateTimeFormatter.format(new Date(value));
}

export function formatDate(value: Date | string | number) {
  return dateFormatter.format(new Date(value));
}

export function formatShortDate(value: Date | string | number) {
  return shortDateFormatter.format(new Date(value));
}

export function formatChannelLabel(channel: ChannelType) {
  return channelLabels[channel] ?? channel;
}

export function formatLeadStageLabel(stage: LeadStageType) {
  return leadStageLabels[stage] ?? humanizeToken(stage);
}

export function formatStageValueLabel(stage: string) {
  return stage in leadStageLabels
    ? formatLeadStageLabel(stage as LeadStageType)
    : humanizeToken(stage);
}

export function formatOrderStatusLabel(status: OrderStatusEnum) {
  return humanizeToken(status);
}

export function formatPaymentStatusLabel(status: string) {
  return humanizeToken(status);
}

export function formatCustomerStatusLabel(status: string | null) {
  if (!status?.trim()) {
    return "Sin clasificar";
  }

  return humanizeToken(status);
}

export function formatSenderLabel(senderType: SenderType) {
  return senderLabels[senderType] ?? senderType;
}

export function formatObjectionLabel(type: string, subtype?: string | null) {
  if (!subtype?.trim()) {
    return humanizeToken(type);
  }

  return `${humanizeToken(type)} / ${humanizeToken(subtype)}`;
}

export function formatDurationHours(hours: number) {
  if (hours >= 24) {
    return `${(hours / 24).toFixed(1)} d`;
  }

  return `${hours.toFixed(1)} h`;
}

export function formatDurationSeconds(durationSeconds: number | null) {
  if (durationSeconds == null || durationSeconds <= 0) {
    return "Sin duracion";
  }

  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);

  if (hours <= 0) {
    return `${minutes} min`;
  }

  if (minutes <= 0) {
    return `${hours} h`;
  }

  return `${hours} h ${minutes} min`;
}

export function formatCustomerDisplayName(displayName: string | null) {
  return displayName?.trim() || "Cliente sin nombre";
}

export function formatOrderShortId(orderId: string) {
  return `#${orderId.slice(0, 8)}`;
}

export function getLeadStageBadge(stage: LeadStageType): StatusBadgeViewModel {
  return createBadge(formatLeadStageLabel(stage), leadStageTones[stage]);
}

export function getOrderStatusBadge(status: OrderStatusEnum): StatusBadgeViewModel {
  return createBadge(formatOrderStatusLabel(status), orderStatusTones[status] ?? "neutral");
}

export function getPaymentStatusBadge(status: string): StatusBadgeViewModel {
  const normalizedStatus = status.trim().toLowerCase();

  if (["completed", "paid", "approved", "validated"].includes(normalizedStatus)) {
    return createBadge(formatPaymentStatusLabel(status), "success");
  }

  if (["pending", "pending_validation", "review", "payment_review"].includes(normalizedStatus)) {
    return createBadge(formatPaymentStatusLabel(status), "warning");
  }

  if (["rejected", "failed", "cancelled"].includes(normalizedStatus)) {
    return createBadge(formatPaymentStatusLabel(status), "danger");
  }

  return createBadge(formatPaymentStatusLabel(status), "neutral");
}

export function getCustomerStatusBadge(status: string | null): StatusBadgeViewModel {
  const normalizedStatus = status?.trim().toLowerCase();

  if (!normalizedStatus) {
    return createBadge(formatCustomerStatusLabel(status), "neutral");
  }

  if (["vip", "active", "retained"].includes(normalizedStatus)) {
    return createBadge(formatCustomerStatusLabel(status), "success");
  }

  if (["new", "prospect"].includes(normalizedStatus)) {
    return createBadge(formatCustomerStatusLabel(status), "info");
  }

  if (["dormant", "at_risk"].includes(normalizedStatus)) {
    return createBadge(formatCustomerStatusLabel(status), "warning");
  }

  if (["lost", "blocked", "blacklist"].includes(normalizedStatus)) {
    return createBadge(formatCustomerStatusLabel(status), "danger");
  }

  return createBadge(formatCustomerStatusLabel(status), "neutral");
}

export function getStatusBadgeClassName(tone: BadgeTone) {
  switch (tone) {
    case "success":
      return "inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800";
    case "warning":
      return "inline-flex items-center rounded-full border border-amber-200/80 bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-800";
    case "danger":
      return "inline-flex items-center rounded-full border border-rose-200/80 bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-rose-700";
    case "info":
      return "inline-flex items-center rounded-full border border-primary/10 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary";
    case "neutral":
    default:
      return "inline-flex items-center rounded-full border border-border/80 bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700";
  }
}

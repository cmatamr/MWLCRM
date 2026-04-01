import type {
  ChannelType,
  LeadStageType,
  OrderStatusEnum,
  SenderType,
} from "@prisma/client";

import type { BadgeTone, StatusBadgeViewModel } from "./common";

const dateFormatter = new Intl.DateTimeFormat("es-CR", {
  dateStyle: "medium",
});

const dateOnlyFormatter = new Intl.DateTimeFormat("es-CR", {
  dateStyle: "medium",
  timeZone: "UTC",
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

const paymentStatusLabels: Record<string, string> = {
  pending: "Pendiente",
  pending_validation: "Pendiente validacion",
  review: "En revision",
  payment_review: "Revision de pago",
  validated: "Verificado",
  approved: "Aprobado",
  paid: "Pagado",
  completed: "Completado",
  rejected: "Rechazado",
  failed: "Fallido",
  cancelled: "Cancelado",
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

const monthLabelsShort = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

function toValidDate(value: Date | string | number) {
  const date = new Date(value);

  return Number.isFinite(date.getTime()) ? date : null;
}

export function formatCurrencyCRC(value: number) {
  const sign = value < 0 ? "-" : "";
  const absoluteValue = Math.abs(value);
  const [integerPart = "0", decimalPart = "00"] = absoluteValue.toFixed(2).split(".");
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${sign}₡${formattedInteger},${decimalPart}`;
}

export function formatDateTime(value: Date | string | number) {
  const date = toValidDate(value);

  if (!date) {
    return "Fecha invalida";
  }

  const day = date.getDate();
  const month = monthLabelsShort[date.getMonth()] ?? "";
  const year = date.getFullYear();
  const hours24 = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const period = hours24 >= 12 ? "p. m." : "a. m.";
  const hours12 = hours24 % 12 || 12;

  return `${day} ${month} ${year}, ${hours12}:${minutes} ${period}`;
}

export function formatDate(value: Date | string | number) {
  const date = toValidDate(value);

  return date ? dateFormatter.format(date) : "Fecha invalida";
}

export function formatCalendarDate(value: Date | string | number) {
  if (typeof value === "string") {
    const matchedDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (matchedDate) {
      const [, year, month, day] = matchedDate;
      const date = toValidDate(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      return date ? dateOnlyFormatter.format(date) : "Fecha invalida";
    }
  }

  const date = toValidDate(value);

  return date ? dateOnlyFormatter.format(date) : "Fecha invalida";
}

export function formatShortDate(value: Date | string | number) {
  const date = toValidDate(value);

  return date ? shortDateFormatter.format(date) : "Fecha invalida";
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
  const normalizedStatus = status.trim().toLowerCase();
  return paymentStatusLabels[normalizedStatus] ?? humanizeToken(status);
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
      return "inline-flex items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-100 px-3 py-1 text-center text-xs font-semibold uppercase leading-none tracking-[0.12em] text-emerald-800";
    case "warning":
      return "inline-flex items-center justify-center rounded-full border border-amber-200/80 bg-amber-100 px-3 py-1 text-center text-xs font-semibold uppercase leading-none tracking-[0.12em] text-amber-800";
    case "danger":
      return "inline-flex items-center justify-center rounded-full border border-rose-200/80 bg-rose-100 px-3 py-1 text-center text-xs font-semibold uppercase leading-none tracking-[0.12em] text-rose-700";
    case "info":
      return "inline-flex items-center justify-center rounded-full border border-primary/10 bg-primary/10 px-3 py-1 text-center text-xs font-semibold uppercase leading-none tracking-[0.12em] text-primary";
    case "neutral":
    default:
      return "inline-flex items-center justify-center rounded-full border border-border/80 bg-white/85 px-3 py-1 text-center text-xs font-semibold uppercase leading-none tracking-[0.12em] text-slate-700";
  }
}

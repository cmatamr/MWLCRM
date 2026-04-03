import type { ChannelType } from "@prisma/client";

export const COSTA_RICA_PHONE_PREFIX = "+506";
export const COSTA_RICA_LOCAL_PHONE_LENGTH = 8;

function toDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function getCostaRicaLocalPhoneDigits(value: string) {
  let digits = toDigits(value);

  if (digits.startsWith("506")) {
    digits = digits.slice(3);
  }

  return digits.slice(0, COSTA_RICA_LOCAL_PHONE_LENGTH);
}

export function formatCostaRicaPhoneVisual(value: string) {
  const digits = getCostaRicaLocalPhoneDigits(value);

  if (digits.length <= 4) {
    return digits;
  }

  return `${digits.slice(0, 4)} ${digits.slice(4)}`;
}

export function normalizeCustomerExternalIdForStorage(
  value: string,
  channel: ChannelType,
): string | null {
  const trimmed = value.trim();

  if (channel !== "wa") {
    return trimmed.length > 0 ? trimmed : null;
  }

  const digits = getCostaRicaLocalPhoneDigits(trimmed);

  if (digits.length !== COSTA_RICA_LOCAL_PHONE_LENGTH) {
    return null;
  }

  return `${COSTA_RICA_PHONE_PREFIX}${digits}`;
}

export function isValidCustomerExternalId(value: string, channel: ChannelType) {
  return normalizeCustomerExternalIdForStorage(value, channel) !== null;
}

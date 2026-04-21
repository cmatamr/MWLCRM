const DATE_TIME_LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function toNumber(value: string, label: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${label} inválido.`);
  }
  return parsed;
}

function parseDateTimeLocalParts(value: string): DateTimeParts | null {
  const match = DATE_TIME_LOCAL_PATTERN.exec(value.trim());

  if (!match) {
    return null;
  }

  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw, secondRaw] = match;

  return {
    year: toNumber(yearRaw as string, "Año"),
    month: toNumber(monthRaw as string, "Mes"),
    day: toNumber(dayRaw as string, "Día"),
    hour: toNumber(hourRaw as string, "Hora"),
    minute: toNumber(minuteRaw as string, "Minuto"),
    second: secondRaw ? toNumber(secondRaw, "Segundo") : 0,
  };
}

function isValidDateTimeParts(parts: DateTimeParts): boolean {
  if (parts.month < 1 || parts.month > 12) {
    return false;
  }

  if (parts.day < 1 || parts.day > 31) {
    return false;
  }

  if (parts.hour < 0 || parts.hour > 23) {
    return false;
  }

  if (parts.minute < 0 || parts.minute > 59) {
    return false;
  }

  if (parts.second < 0 || parts.second > 59) {
    return false;
  }

  const lastDay = new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();
  return parts.day <= lastDay;
}

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  });
}

function formatInstantParts(date: Date, timeZone: string): DateTimeParts {
  const formatter = getFormatter(timeZone);
  const parts = formatter.formatToParts(date);

  const map = new Map(parts.map((part) => [part.type, part.value]));

  const year = map.get("year");
  const month = map.get("month");
  const day = map.get("day");
  const hour = map.get("hour");
  const minute = map.get("minute");
  const second = map.get("second");

  if (!year || !month || !day || !hour || !minute || !second) {
    throw new Error("No se pudieron leer los componentes de fecha.");
  }

  return {
    year: toNumber(year, "Año"),
    month: toNumber(month, "Mes"),
    day: toNumber(day, "Día"),
    hour: toNumber(hour, "Hora"),
    minute: toNumber(minute, "Minuto"),
    second: toNumber(second, "Segundo"),
  };
}

function toComparableUtcMs(parts: DateTimeParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

function assertValidTimeZone(timeZone: string): string {
  const normalized = timeZone.trim();

  if (!normalized) {
    throw new Error("Zona horaria requerida.");
  }

  try {
    getFormatter(normalized);
  } catch {
    throw new Error("Zona horaria inválida.");
  }

  return normalized;
}

function toUtcDateFromLocalParts(parts: DateTimeParts, timeZone: string): Date {
  const targetComparableMs = toComparableUtcMs(parts);
  let guessMs = targetComparableMs;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const resolved = formatInstantParts(new Date(guessMs), timeZone);
    const resolvedComparableMs = toComparableUtcMs(resolved);
    const deltaMs = targetComparableMs - resolvedComparableMs;

    if (deltaMs === 0) {
      return new Date(guessMs);
    }

    guessMs += deltaMs;
  }

  const fallbackDate = new Date(guessMs);
  const fallbackParts = formatInstantParts(fallbackDate, timeZone);

  if (toComparableUtcMs(fallbackParts) !== targetComparableMs) {
    throw new Error("Fecha/hora inválida para la zona horaria indicada.");
  }

  return fallbackDate;
}

export function parseDateTimeInputToUtcDate(input: {
  value: string;
  timeZone: string;
}): Date {
  const normalizedTimeZone = assertValidTimeZone(input.timeZone);
  const rawValue = input.value.trim();

  if (!rawValue) {
    throw new Error("Fecha/hora requerida.");
  }

  const localParts = parseDateTimeLocalParts(rawValue);

  if (localParts) {
    if (!isValidDateTimeParts(localParts)) {
      throw new Error("Fecha/hora inválida.");
    }

    return toUtcDateFromLocalParts(localParts, normalizedTimeZone);
  }

  const parsedAbsolute = new Date(rawValue);

  if (Number.isNaN(parsedAbsolute.getTime())) {
    throw new Error("Fecha/hora inválida.");
  }

  return parsedAbsolute;
}

export function formatDateToDateTimeLocalInTimeZone(input: {
  date: Date | string;
  timeZone: string;
}): string {
  const normalizedTimeZone = assertValidTimeZone(input.timeZone);
  const date = input.date instanceof Date ? input.date : new Date(input.date);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Fecha inválida.");
  }

  const parts = formatInstantParts(date, normalizedTimeZone);

  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

export function normalizeTimeZoneName(value: string): string {
  return assertValidTimeZone(value);
}

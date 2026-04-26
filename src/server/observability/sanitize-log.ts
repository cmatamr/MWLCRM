const SENSITIVE_KEY_NORMALIZED = new Set([
  "password",
  "token",
  "accesstoken",
  "refreshtoken",
  "authorization",
  "cookie",
  "apikey",
]);

const MAX_METADATA_BYTES = 5 * 1024;
const OMIT = Symbol("omit");

function sanitizeUrlForLogging(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  try {
    const url = new URL(trimmed);
    if (!url.search) {
      return trimmed;
    }

    return `${url.origin}${url.pathname}?[REDACTED_QUERY]${url.hash}`;
  } catch {
    return trimmed.replace(
      /([?&])(password|access_token|refresh_token|token|authorization|cookie|api_key|apikey)=([^&#\s]*)/gi,
      (_, separator, key) => `${separator}${key}=[REDACTED]`,
    );
  }
}

function normalizeSensitiveKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_NORMALIZED.has(normalizeSensitiveKey(key));
}

export function scrubSensitiveString(value: string): string {
  if (!value) {
    return value;
  }

  const redactedHeaders = value
    .replace(/(authorization\s*[:=]\s*)(bearer\s+)?[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/(set-cookie\s*:\s*)[^\n]+/gi, "$1[REDACTED]")
    .replace(/(cookie\s*[:=]\s*)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(
      /(access_token|refresh_token|api[_-]?key|token|password)\s*[:=]\s*[^\s,;]+/gi,
      "$1=[REDACTED]",
    );

  return sanitizeUrlForLogging(redactedHeaders);
}

function sanitizeUnknown(
  value: unknown,
  seen: WeakSet<object>,
): unknown | typeof OMIT {
  if (value === undefined) {
    return OMIT;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    return scrubSensitiveString(value);
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: scrubSensitiveString(value.message),
      stack: value.stack ? scrubSensitiveString(value.stack) : null,
    };
  }

  if (typeof value === "function" || typeof value === "symbol") {
    return OMIT;
  }

  if (typeof value !== "object") {
    return String(value);
  }

  if (seen.has(value)) {
    return "[Circular]";
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((entry) => {
      const sanitized = sanitizeUnknown(entry, seen);
      return sanitized === OMIT ? null : sanitized;
    });
  }

  const output: Record<string, unknown> = {};

  for (const [key, nested] of Object.entries(value)) {
    if (isSensitiveKey(key)) {
      continue;
    }

    const sanitized = sanitizeUnknown(nested, seen);
    if (sanitized === OMIT) {
      continue;
    }

    output[key] = sanitized;
  }

  return output;
}

function safeStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

export function sanitizeLogMetadata(metadata: unknown): Record<string, unknown> {
  try {
    if (metadata == null) {
      return {};
    }

    const sanitized = sanitizeUnknown(metadata, new WeakSet<object>());

    const normalized =
      sanitized === OMIT
        ? {}
        : Array.isArray(sanitized)
          ? { items: sanitized }
          : typeof sanitized === "object" && sanitized !== null
            ? (sanitized as Record<string, unknown>)
            : { value: sanitized };

    const serialized = safeStringify(normalized);

    if (!serialized) {
      return { truncated: true };
    }

    if (Buffer.byteLength(serialized, "utf8") > MAX_METADATA_BYTES) {
      return { truncated: true };
    }

    return normalized;
  } catch {
    return { truncated: true };
  }
}

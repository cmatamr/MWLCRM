const REDACTED = "[REDACTED]";

export const SENSITIVE_LOG_KEYS = new Set([
  "password",
  "currentpassword",
  "current_password",
  "newpassword",
  "new_password",
  "confirmpassword",
  "confirm_password",
  "token",
  "access_token",
  "refresh_token",
  "authorization",
  "apikey",
  "api_key",
  "service_role",
  "confirmnewpassword",
  "confirm_new_password",
  "secret",
  "bearer",
  "cookie",
  "set-cookie",
]);

const SENSITIVE_QUERY_KEYS = new Set([
  ...SENSITIVE_LOG_KEYS,
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function redactStringQueryAssignments(value: string): string {
  // Masks query-like assignments even when strings are not parseable URLs.
  return value.replace(
    /([?&])(password|currentpassword|current_password|newpassword|new_password|confirmpassword|confirm_password|confirmnewpassword|confirm_new_password|token|access_token|refresh_token|authorization|apikey|api_key|service_role|secret|bearer|cookie|set-cookie)=([^&#\s]*)/gi,
    (_, separator, key) => `${separator}${key}=${REDACTED}`,
  );
}

export function sanitizeUrlForLogging(value: string): string {
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
    return redactStringQueryAssignments(trimmed);
  }
}

export function maskEmail(email: string | null | undefined): string | null {
  if (!email) {
    return null;
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    return null;
  }

  const [localPart, domain] = normalized.split("@");
  if (!localPart || !domain) {
    return null;
  }

  if (localPart.length <= 2) {
    return `${"*".repeat(localPart.length)}@${domain}`;
  }

  return `${localPart.slice(0, 2)}${"*".repeat(Math.max(1, localPart.length - 2))}@${domain}`;
}

function redactValue(value: unknown, seen: WeakSet<object>, parentKey?: string): unknown {
  if (typeof value === "string") {
    if (parentKey && SENSITIVE_LOG_KEYS.has(parentKey.toLowerCase())) {
      return REDACTED;
    }

    return sanitizeUrlForLogging(redactStringQueryAssignments(value));
  }

  if (!isRecord(value)) {
    return value;
  }

  if (seen.has(value)) {
    return "[Circular]";
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, seen));
  }

  const output: Record<string, unknown> = {};

  for (const [key, nested] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();

    if (SENSITIVE_LOG_KEYS.has(normalizedKey)) {
      output[key] = REDACTED;
      continue;
    }

    if (typeof nested === "string" && SENSITIVE_QUERY_KEYS.has(normalizedKey)) {
      output[key] = REDACTED;
      continue;
    }

    output[key] = redactValue(nested, seen, key);
  }

  return output;
}

export function redactSensitiveData<T = unknown>(value: T): T {
  return redactValue(value, new WeakSet()) as T;
}

export function redactLogArgs(args: unknown[]): unknown[] {
  return args.map((arg) => redactSensitiveData(arg));
}

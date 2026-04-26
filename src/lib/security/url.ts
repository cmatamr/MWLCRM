const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

export function toSafeLinkHref(input: string | null | undefined, fallback = "/"): string {
  const value = (input ?? "").trim();
  if (!value) {
    return fallback;
  }

  if (value.startsWith("/")) {
    return value;
  }

  try {
    const parsed = new URL(value);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return fallback;
    }

    if ((parsed.protocol === "mailto:" || parsed.protocol === "tel:") && parsed.search) {
      return `${parsed.protocol}${parsed.pathname}`;
    }

    return parsed.toString();
  } catch {
    return fallback;
  }
}

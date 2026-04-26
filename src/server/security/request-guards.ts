import { getSiteUrl } from "@/lib/site-url";
import { badRequest, forbidden } from "@/server/api/http";

function normalizeOrigin(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "null") {
    return null;
  }

  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

function getRefererOrigin(referer: string | null): string | null {
  if (!referer) {
    return null;
  }

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function getAllowedOrigins(request: Request): Set<string> {
  const allowed = new Set<string>();
  allowed.add(new URL(request.url).origin);
  allowed.add(getSiteUrl());

  return allowed;
}

export function assertJsonRequest(request: Request): void {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.includes("application/json")) {
    throw badRequest("Formato de solicitud no soportado. Usa application/json.");
  }
}

export function assertTrustedOrigin(request: Request): void {
  const allowedOrigins = getAllowedOrigins(request);
  const origin = normalizeOrigin(request.headers.get("origin"));
  const refererOrigin = getRefererOrigin(request.headers.get("referer"));
  const sourceOrigin = origin ?? refererOrigin;

  if (!sourceOrigin) {
    throw forbidden("Solicitud bloqueada por seguridad: origen invalido o ausente.");
  }

  if (!allowedOrigins.has(sourceOrigin)) {
    throw forbidden("Solicitud bloqueada por seguridad: origen no permitido.");
  }
}

import { NextResponse, type NextRequest } from "next/server";

import "@/lib/security/install-log-redaction";
import { isAppRole, isGovernedPasswordRole } from "@/lib/auth/profile";
import {
  createSupabaseMiddlewareContext,
  mergeSupabaseCookies,
} from "@/lib/supabase/middleware";

const PROTECTED_PAGE_PREFIXES = [
  "/dashboard",
  "/orders",
  "/products",
  "/customers",
  "/campaigns",
  "/funnel",
  "/conversations",
  "/search",
  "/admin",
  "/account",
];

const PUBLIC_PATH_PREFIXES = ["/auth/login", "/auth/access-denied", "/auth/logout", "/auth/recover"];

const EXEMPT_API_PATHS = ["/api/internal/cron/meta-campaign-sync"];

const PASSWORD_CHANGE_ONLY_PATHS = ["/account/security/change-password"];
const SENSITIVE_QUERY_KEYS = new Set([
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
]);

function isExemptApiPath(pathname: string): boolean {
  return EXEMPT_API_PATHS.some((path) => pathname === path);
}

function isPublicPath(pathname: string): boolean {
  if (
    pathname === "/" ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return true;
  }

  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isProtectedPath(pathname: string): boolean {
  if (pathname === "/") {
    return true;
  }

  return PROTECTED_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isPasswordChangePath(pathname: string): boolean {
  return PASSWORD_CHANGE_ONLY_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isPasswordExpired(passwordExpiresAt: string | null): boolean {
  if (!passwordExpiresAt) {
    return true;
  }

  const expiresAt = new Date(passwordExpiresAt);

  if (Number.isNaN(expiresAt.getTime())) {
    return true;
  }

  return expiresAt.getTime() <= Date.now();
}

function buildLoginRedirectUrl(request: NextRequest): URL {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  let base = request.nextUrl.origin;

  if (siteUrl) {
    try {
      base = new URL(
        siteUrl.startsWith("http://") || siteUrl.startsWith("https://")
          ? siteUrl
          : `https://${siteUrl}`,
      ).origin;
    } catch {
      base = request.nextUrl.origin;
    }
  }

  const url = new URL("/auth/login", base);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  url.searchParams.set("next", nextPath);
  return url;
}

function buildRedirect(request: NextRequest, pathname: string): URL {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return url;
}

function removeSensitiveQueryParams(url: URL): { changed: boolean; url: URL } {
  const sanitized = new URL(url.toString());
  let changed = false;

  const keys = Array.from(sanitized.searchParams.keys());
  for (const key of keys) {
    if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
      sanitized.searchParams.delete(key);
      changed = true;
    }
  }

  return { changed, url: sanitized };
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const shouldPreserveAuthTokens =
    pathname === "/auth/recover" || pathname.startsWith("/auth/recover/");
  const sanitized = removeSensitiveQueryParams(request.nextUrl);
  if (!shouldPreserveAuthTokens && sanitized.changed && pathname !== "/api/auth/login") {
    return NextResponse.redirect(sanitized.url);
  }

  if (isExemptApiPath(pathname)) {
    return NextResponse.next();
  }

  const protectedPath = isProtectedPath(pathname);
  const publicPath = isPublicPath(pathname);

  if (!protectedPath && !publicPath) {
    return NextResponse.next();
  }

  const { supabase, getResponse } = createSupabaseMiddlewareContext(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (!protectedPath) {
      return getResponse();
    }

    return mergeSupabaseCookies(
      NextResponse.redirect(buildLoginRedirectUrl(request)),
      getResponse(),
    );
  }

  const { data: profile, error } = await supabase
    .from("app_user_profiles")
    .select("role, is_active, status, is_locked, password_reset_required, password_expires_at")
    .eq("id", user.id)
    .maybeSingle<{
      role: string;
      is_active: boolean;
      status: string;
      is_locked: boolean;
      password_reset_required: boolean;
      password_expires_at: string | null;
    }>();

  const hasBaseAccess =
    !error && profile && profile.is_active === true && profile.status !== "inactive" && isAppRole(profile.role);

  if (!hasBaseAccess || profile.is_locked || profile.status === "locked") {
    if (pathname === "/auth/access-denied") {
      return getResponse();
    }

    return mergeSupabaseCookies(
      NextResponse.redirect(buildRedirect(request, "/auth/access-denied")),
      getResponse(),
    );
  }

  if (profile.role === "service" && protectedPath) {
    return mergeSupabaseCookies(
      NextResponse.redirect(buildRedirect(request, "/auth/access-denied")),
      getResponse(),
    );
  }

  if (pathname.startsWith("/admin") && profile.role !== "admin") {
    return mergeSupabaseCookies(
      NextResponse.redirect(buildRedirect(request, "/auth/access-denied")),
      getResponse(),
    );
  }

  if (isGovernedPasswordRole(profile.role)) {
    const requiresPasswordChange =
      profile.password_reset_required === true || isPasswordExpired(profile.password_expires_at);

    if (requiresPasswordChange && protectedPath && !isPasswordChangePath(pathname)) {
      return mergeSupabaseCookies(
        NextResponse.redirect(buildRedirect(request, "/account/security/change-password")),
        getResponse(),
      );
    }

    if (requiresPasswordChange && pathname === "/auth/login") {
      return mergeSupabaseCookies(
        NextResponse.redirect(buildRedirect(request, "/account/security/change-password")),
        getResponse(),
      );
    }
  }

  if (pathname === "/auth/login") {
    const redirectTarget = profile.role === "service" ? "/auth/access-denied" : "/dashboard";

    return mergeSupabaseCookies(
      NextResponse.redirect(buildRedirect(request, redirectTarget)),
      getResponse(),
    );
  }

  const response = getResponse();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};

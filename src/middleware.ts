import { NextResponse, type NextRequest } from "next/server";

import { isProfileAllowed } from "@/lib/auth/profile";
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
];

const PUBLIC_PATH_PREFIXES = [
  "/auth/login",
  "/auth/access-denied",
  "/auth/logout",
];

const EXEMPT_API_PATHS = ["/api/internal/cron/meta-campaign-sync"];

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

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

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
    .select("role, is_active, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const hasAccess = !error && isProfileAllowed(profile);

  if (!hasAccess) {
    if (pathname === "/auth/access-denied") {
      return getResponse();
    }

    const deniedUrl = request.nextUrl.clone();
    deniedUrl.pathname = "/auth/access-denied";
    deniedUrl.search = "";
    return mergeSupabaseCookies(NextResponse.redirect(deniedUrl), getResponse());
  }

  if (pathname === "/auth/login") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return mergeSupabaseCookies(NextResponse.redirect(redirectUrl), getResponse());
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

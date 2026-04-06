import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function buildRedirectToLogin(request: Request) {
  const redirectUrl = new URL("/auth/login", request.url);
  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return buildRedirectToLogin(request);
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return buildRedirectToLogin(request);
}

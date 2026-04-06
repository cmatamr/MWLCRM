"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv } from "@/lib/supabase/config";

let clientInstance: SupabaseClient | null = null;

export function createSupabaseBrowserClient(): SupabaseClient {
  if (clientInstance) {
    return clientInstance;
  }

  const { url, anonKey } = getSupabasePublicEnv();
  clientInstance = createBrowserClient(url, anonKey);
  return clientInstance;
}

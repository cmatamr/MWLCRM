import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv, getSupabaseServiceEnv } from "@/lib/supabase/config";

export function createSupabaseServiceClient(schema = "public"): SupabaseClient<any, any, any> {
  const { url, serviceRoleKey } = getSupabaseServiceEnv();

  return createClient(url, serviceRoleKey, {
    db: {
      schema,
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function createSupabaseStatelessAnonClient(): SupabaseClient<any, any, any> {
  const { url, anonKey } = getSupabasePublicEnv();

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

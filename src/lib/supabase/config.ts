type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

export function getSupabasePublicEnv(): SupabasePublicEnv {
  // Use static env property access so Next can inline values in edge middleware/runtime.
  const nextPublicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serverUrl = process.env.SUPABASE_URL?.trim();
  const nextPublicAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serverAnonKey = process.env.SUPABASE_ANON_KEY?.trim();

  const url = nextPublicUrl || serverUrl;
  const anonKey = nextPublicAnonKey || serverAnonKey;

  if (!url || !anonKey) {
    const debug =
      `NEXT_PUBLIC_SUPABASE_URL=${nextPublicUrl ? "set" : "missing"}, ` +
      `SUPABASE_URL=${serverUrl ? "set" : "missing"}, ` +
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=${nextPublicAnonKey ? "set" : "missing"}, ` +
      `SUPABASE_ANON_KEY=${serverAnonKey ? "set" : "missing"}`;

    throw new Error(`Missing required Supabase environment variable. Checked: ${debug}`);
  }

  return {
    url,
    anonKey,
  };
}

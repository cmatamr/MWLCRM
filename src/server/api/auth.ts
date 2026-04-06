import type { User } from "@supabase/supabase-js";

import { isAppRole, type AppRole, type AppUserProfile } from "@/lib/auth/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { forbidden, unauthorized, ApiRouteError } from "@/server/api/http";

export type SessionProfileContext = {
  user: User;
  profile: AppUserProfile;
};

export async function requireSessionProfile(): Promise<SessionProfileContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw unauthorized("Authentication required.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("app_user_profiles")
    .select("role, is_active, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new ApiRouteError({
      status: 500,
      code: "PROFILE_LOOKUP_FAILED",
      message: "Could not validate internal user profile.",
    });
  }

  if (!profile || profile.is_active !== true || !isAppRole(profile.role)) {
    throw forbidden("Active internal profile required.");
  }

  return {
    user,
    profile,
  };
}

export async function requireRole(role: AppRole): Promise<SessionProfileContext> {
  const context = await requireSessionProfile();

  if (context.profile.role !== role) {
    throw forbidden("Insufficient role for this operation.");
  }

  return context;
}

export async function requireAnyRole(roles: AppRole[]): Promise<SessionProfileContext> {
  const context = await requireSessionProfile();

  if (!roles.includes(context.profile.role)) {
    throw forbidden("Insufficient role for this operation.");
  }

  return context;
}

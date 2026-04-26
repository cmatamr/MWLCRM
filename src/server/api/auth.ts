import type { User } from "@supabase/supabase-js";

import { isAppRole, type AppRole, type AppUserProfile } from "@/lib/auth/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { forbidden, unauthorized, ApiRouteError } from "@/server/api/http";
import {
  isProfileAccessibleForSession,
  validateRoleCanAccessDashboard,
  type AppUserProfileSecurity,
} from "@/server/security";

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
    .select(
      "id, role, is_active, full_name, status, failed_login_attempts, is_locked, locked_at, lock_reason, last_login_at, password_updated_at, password_expires_at, password_reset_required, password_expired_at, invitation_sent_at, invitation_accepted_at, created_by, updated_by",
    )
    .eq("id", user.id)
    .maybeSingle<AppUserProfileSecurity>();

  if (profileError) {
    throw new ApiRouteError({
      status: 500,
      code: "PROFILE_LOOKUP_FAILED",
      message: "Could not validate internal user profile.",
    });
  }

  if (!profile || !isAppRole(profile.role) || !isProfileAccessibleForSession(profile)) {
    throw forbidden("Active internal profile required.");
  }

  validateRoleCanAccessDashboard(profile.role);

  return {
    user,
    profile: profile as AppUserProfile,
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

  const role = context.profile.role;
  const allowLegacyUserAsAgent = role === "user" && roles.includes("agent");

  if (!roles.includes(role) && !allowLegacyUserAsAgent) {
    throw forbidden("Insufficient role for this operation.");
  }

  return context;
}

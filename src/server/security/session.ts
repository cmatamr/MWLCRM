import type { User } from "@supabase/supabase-js";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { forbidden, unauthorized } from "@/server/api/http";
import {
  getProfileByUserId,
  isProfileAccessibleForSession,
  type AppUserProfileSecurity,
} from "@/server/security";

export type GovernedSessionContext = {
  user: User;
  profile: AppUserProfileSecurity;
};

export async function requireAuthenticatedUser(): Promise<User> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw unauthorized("Authentication required.");
  }

  return user;
}

export async function requireGovernedSession(): Promise<GovernedSessionContext> {
  const user = await requireAuthenticatedUser();
  const service = createSupabaseServiceClient();
  const profile = await getProfileByUserId(service, user.id);

  if (!isProfileAccessibleForSession(profile)) {
    throw forbidden("Active and unlocked internal profile required.");
  }

  const safeProfile = profile as AppUserProfileSecurity;

  return {
    user,
    profile: safeProfile,
  };
}

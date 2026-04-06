export const APP_ROLES = ["admin", "agent"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export type AppUserProfile = {
  role: AppRole;
  is_active: boolean;
  full_name: string | null;
};

export function isAppRole(value: string): value is AppRole {
  return APP_ROLES.includes(value as AppRole);
}

export function isProfileAllowed(profile: {
  role: string;
  is_active: boolean;
} | null): profile is AppUserProfile {
  if (!profile) {
    return false;
  }

  return profile.is_active === true && isAppRole(profile.role);
}

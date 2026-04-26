export const APP_ROLES = ["admin", "agent", "user", "service"] as const;
export const GOVERNED_PASSWORD_ROLES = ["admin", "user"] as const;
export const LEGACY_AGENT_ROLE = "agent" as const;
export const APP_USER_STATUSES = [
  "pending_invitation",
  "pending_password_setup",
  "active",
  "inactive",
  "locked",
  "pending_password_reset",
] as const;

export type AppRole = (typeof APP_ROLES)[number];
export type GovernedPasswordRole = (typeof GOVERNED_PASSWORD_ROLES)[number];
export type AppUserStatus = (typeof APP_USER_STATUSES)[number];

export type AppUserProfile = {
  role: AppRole;
  is_active: boolean;
  full_name: string | null;
  status?: string | null;
  is_locked?: boolean | null;
  password_reset_required?: boolean | null;
  password_expires_at?: string | null;
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

export function isGovernedPasswordRole(role: string): role is GovernedPasswordRole {
  return GOVERNED_PASSWORD_ROLES.includes(role as GovernedPasswordRole);
}

export function isAppUserStatus(status: string): status is AppUserStatus {
  return APP_USER_STATUSES.includes(status as AppUserStatus);
}

export function isLegacyRole(role: string): boolean {
  return role === LEGACY_AGENT_ROLE;
}

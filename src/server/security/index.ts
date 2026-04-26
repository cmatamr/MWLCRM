import { hash as argon2Hash, verify as argon2Verify, argon2id } from "argon2";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { isGovernedPasswordRole, isLegacyRole, type AppRole } from "@/lib/auth/profile";
import { maskEmail, redactSensitiveData } from "@/lib/security/redaction";
import { ApiRouteError } from "@/server/api/http";
export { isGovernedPasswordRole };

export type PasswordPolicy = {
  id: string;
  name: string;
  is_active: boolean;
  minimum_length: number;
  minimum_uppercase: number;
  minimum_lowercase: number;
  minimum_numbers: number;
  minimum_symbols: number;
  password_history_check_count: number;
  password_history_keep_count: number;
  password_expiration_days: number;
  expiration_warning_days: number;
  failed_login_lock_enabled: boolean;
  max_failed_login_attempts: number;
  hash_algorithm: "argon2id";
};

export type AppUserProfileSecurity = {
  id: string;
  role: AppRole;
  full_name: string;
  is_active: boolean;
  status: string;
  failed_login_attempts: number;
  is_locked: boolean;
  locked_at: string | null;
  lock_reason: string | null;
  last_login_at: string | null;
  password_updated_at: string | null;
  password_expires_at: string | null;
  password_reset_required: boolean;
  password_expired_at: string | null;
  invitation_sent_at: string | null;
  invitation_accepted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
};

export type LoginDecision = {
  redirectTo: string;
  sessionMode: "normal" | "password_change_only";
  warningMessage?: string;
  daysUntilExpiration?: number;
};

export type SecurityEventInput = {
  userId?: string | null;
  actorUserId?: string | null;
  eventType: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
};

export function nowIso() {
  return new Date().toISOString();
}

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function getRequestIp(request: Request): string | undefined {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  return cfIp || undefined;
}

export function getRequestUserAgent(request: Request): string | undefined {
  return request.headers.get("user-agent")?.trim() || undefined;
}

export function getDaysUntilExpiration(passwordExpiresAt: string | null): number | null {
  if (!passwordExpiresAt) {
    return null;
  }

  const expires = new Date(passwordExpiresAt);
  if (Number.isNaN(expires.getTime())) {
    return null;
  }

  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((expires.getTime() - now.getTime()) / msPerDay);
}

export function getPasswordWarningMessage(daysUntilExpiration: number): string {
  if (daysUntilExpiration <= 0) {
    return "Contrasena vence hoy.";
  }

  if (daysUntilExpiration === 1) {
    return "Contrasena vence en 1 dia.";
  }

  return `Contrasena vence en ${daysUntilExpiration} dias.`;
}

export async function getActivePasswordPolicy(
  service: SupabaseClient,
): Promise<PasswordPolicy> {
  const { data, error } = await service
    .from("app_security_password_policy")
    .select(
      "id, name, is_active, minimum_length, minimum_uppercase, minimum_lowercase, minimum_numbers, minimum_symbols, password_history_check_count, password_history_keep_count, password_expiration_days, expiration_warning_days, failed_login_lock_enabled, max_failed_login_attempts, hash_algorithm",
    )
    .eq("is_active", true)
    .limit(1)
    .maybeSingle<PasswordPolicy>();

  if (error || !data) {
    throw new ApiRouteError({
      status: 500,
      code: "PASSWORD_POLICY_NOT_AVAILABLE",
      message: "No se pudo obtener la politica de seguridad activa.",
      details: error,
    });
  }

  return data;
}

export async function getAuthUserByEmail(
  email: string,
  serviceClient: SupabaseClient,
): Promise<{ id: string; email: string | null } | null> {
  const normalized = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;

  while (page <= 50) {
    const { data, error } = await serviceClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new ApiRouteError({
        status: 500,
        code: "AUTH_USER_LOOKUP_FAILED",
        message: "No se pudo consultar el usuario de autenticacion.",
        details: error,
      });
    }

    const users = data?.users ?? [];
    const found = users.find((user) => (user.email ?? "").toLowerCase() === normalized);

    if (found) {
      return {
        id: found.id,
        email: found.email ?? null,
      };
    }

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return null;
}

export async function getProfileByUserId(
  service: SupabaseClient,
  userId: string,
): Promise<AppUserProfileSecurity | null> {
  const { data, error } = await service
    .from("app_user_profiles")
    .select(
      "id, role, full_name, is_active, status, failed_login_attempts, is_locked, locked_at, lock_reason, last_login_at, password_updated_at, password_expires_at, password_reset_required, password_expired_at, invitation_sent_at, invitation_accepted_at, created_by, updated_by",
    )
    .eq("id", userId)
    .maybeSingle<AppUserProfileSecurity>();

  if (error) {
    throw new ApiRouteError({
      status: 500,
      code: "PROFILE_LOOKUP_FAILED",
      message: "No se pudo validar el perfil interno.",
      details: error,
    });
  }

  return data;
}

export async function updateUserProfileSecurity(
  service: SupabaseClient,
  userId: string,
  updates: Partial<AppUserProfileSecurity> & { updated_by?: string | null },
): Promise<void> {
  const { error } = await service
    .from("app_user_profiles")
    .update({
      ...updates,
      updated_at: nowIso(),
    })
    .eq("id", userId);

  if (error) {
    throw new ApiRouteError({
      status: 500,
      code: "PROFILE_UPDATE_FAILED",
      message: "No se pudo actualizar el perfil de seguridad.",
      details: error,
    });
  }
}

export async function logSecurityEvent(
  service: SupabaseClient,
  input: SecurityEventInput,
): Promise<void> {
  const { error } = await service.from("app_user_security_events").insert({
    user_id: input.userId ?? null,
    actor_user_id: input.actorUserId ?? null,
    event_type: input.eventType,
    event_metadata: input.metadata ?? {},
    ip_address: input.ip ?? null,
    user_agent: input.userAgent ?? null,
  });

  if (error) {
    console.error("Failed to insert app_user_security_events", redactSensitiveData(error));
  }
}

export function assertProfileCanLogin(profile: AppUserProfileSecurity): void {
  if (
    profile.is_active !== true ||
    profile.status === "inactive" ||
    !isStatusLoginAllowed(profile.status)
  ) {
    throw new ApiRouteError({
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "Correo o contrasena incorrectos.",
    });
  }

  if (profile.is_locked || profile.status === "locked") {
    throw new ApiRouteError({
      status: 423,
      code: "ACCOUNT_LOCKED",
      message: "Tu cuenta fue bloqueada por seguridad. Restablece tu contrasena para continuar.",
    });
  }
}

export function validateRoleCanAccessDashboard(role: AppRole): void {
  if (role === "service") {
    throw new ApiRouteError({
      status: 403,
      code: "SERVICE_ACCOUNT_RESTRICTED",
      message: "Las cuentas de servicio no pueden acceder al dashboard normal.",
    });
  }
}

export function validatePasswordComplexity(password: string, policy: PasswordPolicy): string[] {
  const uppercase = (password.match(/[A-Z]/g) ?? []).length;
  const lowercase = (password.match(/[a-z]/g) ?? []).length;
  const numbers = (password.match(/[0-9]/g) ?? []).length;
  const symbols = (password.match(/[^A-Za-z0-9\s]/g) ?? []).length;

  const issues: string[] = [];

  if (password.length < policy.minimum_length) {
    issues.push(`Debe tener al menos ${policy.minimum_length} caracteres.`);
  }

  if (uppercase < policy.minimum_uppercase) {
    issues.push(`Debe incluir al menos ${policy.minimum_uppercase} mayuscula(s).`);
  }

  if (lowercase < policy.minimum_lowercase) {
    issues.push(`Debe incluir al menos ${policy.minimum_lowercase} minuscula(s).`);
  }

  if (numbers < policy.minimum_numbers) {
    issues.push(`Debe incluir al menos ${policy.minimum_numbers} numero(s).`);
  }

  if (symbols < policy.minimum_symbols) {
    issues.push(`Debe incluir al menos ${policy.minimum_symbols} simbolo(s).`);
  }

  return issues;
}

export async function isPasswordReused(
  service: SupabaseClient,
  userId: string,
  plainPassword: string,
  checkCount: number,
): Promise<boolean> {
  const { data, error } = await service
    .from("app_user_password_history")
    .select("password_hash")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(checkCount);

  if (error) {
    throw new ApiRouteError({
      status: 500,
      code: "PASSWORD_HISTORY_LOOKUP_FAILED",
      message: "No se pudo validar el historial de contrasenas.",
      details: error,
    });
  }

  for (const row of data ?? []) {
    const passwordHash = String((row as { password_hash: string }).password_hash ?? "");
    if (!passwordHash) {
      continue;
    }

    // Argon2 includes salt in the stored hash, so verification is deterministic.
    if (await argon2Verify(passwordHash, plainPassword)) {
      return true;
    }
  }

  return false;
}

export async function hashPasswordForHistory(plainPassword: string): Promise<string> {
  return argon2Hash(plainPassword, {
    type: argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function writePasswordHistory(
  service: SupabaseClient,
  input: {
    userId: string;
    actorUserId?: string | null;
    passwordHash: string;
    eventType:
      | "initial_setup"
      | "user_change"
      | "admin_forced_reset"
      | "expired_password_change"
      | "locked_account_reset";
  },
): Promise<void> {
  const { error } = await service.from("app_user_password_history").insert({
    user_id: input.userId,
    password_hash: input.passwordHash,
    hash_algorithm: "argon2id",
    event_type: input.eventType,
    created_by: input.actorUserId ?? null,
  });

  if (error) {
    throw new ApiRouteError({
      status: 500,
      code: "PASSWORD_HISTORY_WRITE_FAILED",
      message: "No se pudo guardar el historial de contrasenas.",
      details: error,
    });
  }
}

export async function prunePasswordHistory(
  service: SupabaseClient,
  userId: string,
  keepCount: number,
): Promise<void> {
  const { error } = await service.rpc("prune_user_password_history", {
    p_user_id: userId,
    p_keep_count: keepCount,
  });

  if (error) {
    throw new ApiRouteError({
      status: 500,
      code: "PASSWORD_HISTORY_PRUNE_FAILED",
      message: "No se pudo podar el historial de contrasenas.",
      details: error,
    });
  }
}

export async function applyNewPassword(
  service: SupabaseClient,
  input: {
    userId: string;
    actorUserId?: string | null;
    newPassword: string;
    eventType:
      | "initial_setup"
      | "user_change"
      | "admin_forced_reset"
      | "expired_password_change"
      | "locked_account_reset";
    profileRole: AppRole;
    policy: PasswordPolicy;
    ip?: string;
    userAgent?: string;
  },
): Promise<void> {
  const issues = validatePasswordComplexity(input.newPassword, input.policy);

  if (issues.length > 0) {
    await logSecurityEvent(service, {
      userId: input.userId,
      actorUserId: input.actorUserId,
      eventType: "password_policy_failed",
      metadata: {
        issues,
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    throw new ApiRouteError({
      status: 400,
      code: "PASSWORD_POLICY_FAILED",
      message: "La contrasena no cumple la politica activa.",
      details: {
        issues,
      },
    });
  }

  if (!isLegacyRole(input.profileRole) && input.profileRole !== "service") {
    const reused = await isPasswordReused(
      service,
      input.userId,
      input.newPassword,
      input.policy.password_history_check_count,
    );

    if (reused) {
      await logSecurityEvent(service, {
        userId: input.userId,
        actorUserId: input.actorUserId,
        eventType: "password_reuse_rejected",
        ip: input.ip,
        userAgent: input.userAgent,
      });

      throw new ApiRouteError({
        status: 409,
        code: "PASSWORD_REUSE_REJECTED",
        message: "No puedes reutilizar una contrasena reciente.",
      });
    }
  }

  const { error: authError } = await service.auth.admin.updateUserById(input.userId, {
    password: input.newPassword,
  });

  if (authError) {
    throw new ApiRouteError({
      status: 500,
      code: "AUTH_PASSWORD_UPDATE_FAILED",
      message: "No se pudo actualizar la contrasena en Auth.",
      details: authError,
    });
  }

  const passwordHash = await hashPasswordForHistory(input.newPassword);
  await writePasswordHistory(service, {
    userId: input.userId,
    actorUserId: input.actorUserId,
    passwordHash,
    eventType: input.eventType,
  });

  await prunePasswordHistory(service, input.userId, input.policy.password_history_keep_count);

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + input.policy.password_expiration_days);

  await updateUserProfileSecurity(service, input.userId, {
    password_updated_at: now.toISOString(),
    password_expires_at: isGovernedPasswordRole(input.profileRole)
      ? expiresAt.toISOString()
      : null,
    password_reset_required: false,
    password_expired_at: null,
    failed_login_attempts: 0,
    is_locked: false,
    locked_at: null,
    lock_reason: null,
    status: "active",
    updated_by: input.actorUserId ?? null,
  });

  await logSecurityEvent(service, {
    userId: input.userId,
    actorUserId: input.actorUserId,
    eventType: "password_history_recorded",
    metadata: {
      event_type: input.eventType,
      keep_count: input.policy.password_history_keep_count,
    },
    ip: input.ip,
    userAgent: input.userAgent,
  });

  await logSecurityEvent(service, {
    userId: input.userId,
    actorUserId: input.actorUserId,
    eventType: "password_updated",
    metadata: {
      event_type: input.eventType,
      password_expiration_days: input.policy.password_expiration_days,
    },
    ip: input.ip,
    userAgent: input.userAgent,
  });
}

export async function resolveLoginDecision(
  service: SupabaseClient,
  profile: AppUserProfileSecurity,
  policy: PasswordPolicy,
  input: {
    ip?: string;
    userAgent?: string;
  },
): Promise<LoginDecision> {
  if (profile.role === "service") {
    return {
      redirectTo: "/auth/access-denied",
      sessionMode: "normal",
    };
  }

  if (!isGovernedPasswordRole(profile.role)) {
    return {
      redirectTo: "/dashboard",
      sessionMode: "normal",
    };
  }

  const passwordExpiresAt = profile.password_expires_at;
  const daysUntilExpiration = getDaysUntilExpiration(passwordExpiresAt);

  if (profile.password_reset_required || daysUntilExpiration == null || daysUntilExpiration <= 0) {
    await updateUserProfileSecurity(service, profile.id, {
      password_reset_required: true,
      password_expired_at: nowIso(),
      status: "pending_password_reset",
    });

    await logSecurityEvent(service, {
      userId: profile.id,
      eventType: "login_success_password_expired",
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: {
        password_expires_at: passwordExpiresAt,
      },
    });

    return {
      redirectTo: "/account/security/change-password",
      sessionMode: "password_change_only",
      warningMessage: "Tu contrasena vencio. Debes cambiarla para continuar.",
      daysUntilExpiration: Math.min(daysUntilExpiration ?? 0, 0),
    };
  }

  if (daysUntilExpiration <= policy.expiration_warning_days) {
    await logSecurityEvent(service, {
      userId: profile.id,
      eventType: "password_expiration_warning_shown",
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: {
        days_until_expiration: daysUntilExpiration,
        expiration_warning_days: policy.expiration_warning_days,
      },
    });

    return {
      redirectTo: "/account/security/password-warning",
      sessionMode: "normal",
      warningMessage: getPasswordWarningMessage(daysUntilExpiration),
      daysUntilExpiration,
    };
  }

  return {
    redirectTo: "/dashboard",
    sessionMode: "normal",
    daysUntilExpiration,
  };
}

export function isStatusLoginAllowed(status: string): boolean {
  return ["active", "pending_password_setup", "pending_password_reset"].includes(status);
}

export function isProfileAccessibleForSession(profile: AppUserProfileSecurity | null): boolean {
  if (!profile || profile.is_active !== true || profile.status === "inactive") {
    return false;
  }

  if (profile.is_locked || profile.status === "locked") {
    return false;
  }

  return true;
}

export async function incrementFailedLoginAttempt(
  service: SupabaseClient,
  profile: AppUserProfileSecurity,
  policy: PasswordPolicy,
  input: {
    ip?: string;
    userAgent?: string;
    attemptedEmail?: string;
  },
): Promise<{ locked: boolean; attempts: number }> {
  const nextAttempts = Math.max(0, profile.failed_login_attempts ?? 0) + 1;

  const shouldLock =
    policy.failed_login_lock_enabled && nextAttempts >= policy.max_failed_login_attempts;

  await updateUserProfileSecurity(service, profile.id, {
    failed_login_attempts: nextAttempts,
    ...(shouldLock
      ? {
          is_locked: true,
          status: "locked",
          locked_at: nowIso(),
          lock_reason: "failed_login_attempts",
        }
      : {}),
  });

  await logSecurityEvent(service, {
    userId: profile.id,
    eventType: "login_failed",
    ip: input.ip,
    userAgent: input.userAgent,
    metadata: {
      attempted_email: maskEmail(input.attemptedEmail),
      success: false,
      reason_code: "INVALID_CREDENTIALS",
      timestamp: nowIso(),
    },
  });

  if (shouldLock) {
    await logSecurityEvent(service, {
      userId: profile.id,
      eventType: "account_locked",
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: {
        reason: "failed_login_attempts",
        failed_login_attempts: nextAttempts,
      },
    });
  }

  return {
    locked: shouldLock,
    attempts: nextAttempts,
  };
}

export async function markLoginSuccess(
  service: SupabaseClient,
  user: User,
  input: {
    ip?: string;
    userAgent?: string;
    email?: string;
  },
): Promise<void> {
  await updateUserProfileSecurity(service, user.id, {
    failed_login_attempts: 0,
    last_login_at: nowIso(),
  });

  await logSecurityEvent(service, {
    userId: user.id,
    eventType: "login_success",
    ip: input.ip,
    userAgent: input.userAgent,
    metadata: {
      attempted_email: maskEmail(input.email),
      success: true,
      reason_code: "LOGIN_SUCCESS",
      timestamp: nowIso(),
    },
  });
}

export function ensureAdminRoleOrThrow(role: AppRole): void {
  if (role !== "admin") {
    throw new ApiRouteError({
      status: 403,
      code: "FORBIDDEN",
      message: "Solo administradores pueden acceder a este recurso.",
    });
  }
}

export async function countActiveAdmins(service: SupabaseClient): Promise<number> {
  const { count, error } = await service
    .from("app_user_profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("is_active", true)
    .eq("status", "active")
    .eq("is_locked", false);

  if (error) {
    throw new ApiRouteError({
      status: 500,
      code: "ACTIVE_ADMIN_COUNT_FAILED",
      message: "No se pudo validar la cantidad de admins activos.",
      details: error,
    });
  }

  return count ?? 0;
}

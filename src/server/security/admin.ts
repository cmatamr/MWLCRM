import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { maskEmail, redactSensitiveData } from "@/lib/security/redaction";
import { getSiteUrl } from "@/lib/site-url";
import { LEGACY_AGENT_ROLE, type AppRole } from "@/lib/auth/profile";
import { conflict, forbidden, notFound, ApiRouteError } from "@/server/api/http";
import { logInfo, logWarn } from "@/server/observability/logger";
import {
  countActiveAdmins,
  getActivePasswordPolicy,
  getAuthUserByEmail,
  getDaysUntilExpiration,
  getPasswordWarningMessage,
  getProfileByUserId,
  isGovernedPasswordRole,
  logSecurityEvent,
  nowIso,
  type AppUserProfileSecurity,
} from "@/server/security";
import { requireGovernedSession } from "@/server/security/session";

const CREATE_ALLOWED_ROLES = ["admin", "user", "service"] as const;

export const createAdminUserSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  email: z.string().trim().email(),
  role: z.enum(CREATE_ALLOWED_ROLES),
});

export const updateAdminUserSchema = z.object({
  fullName: z.string().trim().min(2).max(160).optional(),
  role: z.enum(CREATE_ALLOWED_ROLES).optional(),
});

export const policyUpdateSchema = z.object({
  minimum_length: z.number().int().min(8),
  minimum_uppercase: z.number().int().min(1),
  minimum_lowercase: z.number().int().min(1),
  minimum_numbers: z.number().int().min(1),
  minimum_symbols: z.number().int().min(1),
  password_history_check_count: z.number().int().min(3),
  password_history_keep_count: z.number().int().min(3),
  password_expiration_days: z.number().int().min(30).max(180),
  expiration_warning_days: z.number().int().min(1),
  max_failed_login_attempts: z.number().int().min(3).max(5),
});

export async function requireAdminSecurityContext() {
  const context = await requireGovernedSession();

  if (context.profile.role !== "admin") {
    await logWarn({
      source: "admin.authorization",
      eventType: "admin_access_denied",
      message: "Acceso denegado: se requiere rol admin.",
      userId: context.user.id,
      metadata: {
        role: context.profile.role,
        status: context.profile.status,
        is_active: context.profile.is_active,
      },
    });

    throw forbidden("Solo administradores pueden acceder a este recurso.");
  }

  return context;
}

export async function getAuthUserById(
  authSchemaClient: SupabaseClient,
  userId: string,
): Promise<{ id: string; email: string | null } | null> {
  const users = await getAuthUsersByIds(authSchemaClient, [userId]);
  return users[0] ?? null;
}

export async function getAuthUsersByIds(
  authSchemaClient: SupabaseClient,
  userIds: string[],
): Promise<Array<{ id: string; email: string | null }>> {
  if (userIds.length === 0) {
    return [];
  }

  const pending = new Set(userIds);
  const result: Array<{ id: string; email: string | null }> = [];
  let page = 1;
  const perPage = 200;

  while (page <= 50 && pending.size > 0) {
    const { data, error } = await authSchemaClient.auth.admin.listUsers({
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
    for (const user of users) {
      if (pending.has(user.id)) {
        result.push({
          id: user.id,
          email: user.email ?? null,
        });
        pending.delete(user.id);
      }
    }

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return result;
}

export function mapSecurityStatus(profile: AppUserProfileSecurity): string {
  if (!profile.is_active || profile.status === "inactive") {
    return "Inactivo";
  }

  if (profile.is_locked || profile.status === "locked") {
    return "Bloqueado";
  }

  if (profile.role === LEGACY_AGENT_ROLE) {
    return "Rol legacy";
  }

  if (profile.password_reset_required || profile.status === "pending_password_reset") {
    return "Reset requerido";
  }

  const days = getDaysUntilExpiration(profile.password_expires_at);

  if (days == null) {
    return "OK";
  }

  if (days <= 0) {
    return "Contrasena vencida";
  }

  if (days === 1) {
    return "Contrasena vence en 1 dia";
  }

  if (days <= 7) {
    return getPasswordWarningMessage(days);
  }

  return "OK";
}

export function ensureNotSelfMutation(adminId: string, targetId: string, action: string): void {
  if (adminId === targetId) {
    throw conflict(`Un admin no puede ${action} su propia cuenta.`);
  }
}

export async function ensureNotLastActiveAdmin(
  service: SupabaseClient,
  target: AppUserProfileSecurity,
): Promise<void> {
  if (target.role !== "admin") {
    return;
  }

  const isActiveAdmin =
    target.is_active === true && target.status === "active" && target.is_locked === false;

  if (!isActiveAdmin) {
    return;
  }

  const activeAdmins = await countActiveAdmins(service);

  if (activeAdmins <= 1) {
    throw conflict("No se puede dejar el sistema sin al menos un admin activo.");
  }
}

export async function ensureUniqueEmailOrThrow(
  authSchemaClient: SupabaseClient,
  email: string,
): Promise<void> {
  const existing = await getAuthUserByEmail(email, authSchemaClient);

  if (existing) {
    throw conflict("Ya existe un usuario con ese correo.");
  }
}

export function buildAdminUserCreatePayload(input: {
  role: (typeof CREATE_ALLOWED_ROLES)[number];
  fullName: string;
  adminUserId: string;
}) {
  const now = nowIso();

  const governedRole = isGovernedPasswordRole(input.role);
  const status = governedRole ? "pending_password_setup" : "active";

  return {
    role: input.role,
    full_name: input.fullName,
    is_active: true,
    status,
    password_reset_required: governedRole,
    failed_login_attempts: 0,
    is_locked: false,
    locked_at: null,
    lock_reason: null,
    created_at: now,
    updated_at: now,
    created_by: input.adminUserId,
    updated_by: input.adminUserId,
    invitation_sent_at: governedRole ? now : null,
    invitation_accepted_at: null,
    password_updated_at: null,
    password_expires_at: null,
    password_expired_at: null,
  };
}

export async function sendPasswordSetupOrResetEmail(
  service: SupabaseClient,
  email: string,
): Promise<void> {
  const configuredRedirect = process.env.SUPABASE_AUTH_REDIRECT_TO?.trim();
  const siteUrl = getSiteUrl();
  const fallbackRedirect =
    siteUrl.startsWith("http://localhost") || siteUrl.startsWith("http://127.0.0.1")
      ? null
      : `${siteUrl}/account/security/change-password`;
  const redirectTo = configuredRedirect || fallbackRedirect;
  const { error } = redirectTo
    ? await service.auth.resetPasswordForEmail(email, { redirectTo })
    : await service.auth.resetPasswordForEmail(email);

  if (error) {
    const rawMessage = `${(error as { message?: string }).message ?? ""}`.toLowerCase();
    const rawCode = `${(error as { code?: string }).code ?? ""}`.toLowerCase();
    let reason = "unknown";
    let message = "No se pudo enviar el correo de setup/reset.";

    if (rawCode === "unexpected_failure") {
      reason = "auth_unexpected_failure";
      message =
        "No se pudo enviar el correo de setup/reset por un fallo interno de Auth/SMTP en Supabase. Revisa la configuracion SMTP de Resend y los Auth logs del proyecto.";
    } else if (rawMessage.includes("rate limit") || rawMessage.includes("too many requests")) {
      reason = "rate_limit";
      message =
        "No se pudo enviar el correo de setup/reset por limite de frecuencia en Auth/SMTP. Espera al menos 60 segundos e intenta de nuevo.";
    } else if (
      rawMessage.includes("redirect") ||
      rawMessage.includes("whitelist") ||
      rawMessage.includes("site url") ||
      rawMessage.includes("not allowed")
    ) {
      reason = "redirect_mismatch";
      message =
        "No se pudo enviar el correo de setup/reset porque la URL de redireccion no esta permitida en Supabase Auth. Revisa Site URL/Redirect URLs y SUPABASE_AUTH_REDIRECT_TO.";
    } else if (
      rawMessage.includes("smtp") ||
      rawMessage.includes("sender") ||
      rawMessage.includes("from address") ||
      rawMessage.includes("authentication") ||
      rawMessage.includes("invalid login")
    ) {
      reason = "smtp_provider_error";
      message =
        "No se pudo enviar el correo de setup/reset por configuracion SMTP (Resend) en Supabase. Revisa host, puerto, usuario, password y remitente verificado.";
    }

    console.error("Password setup/reset email failed", redactSensitiveData({
      email,
      redirectTo,
      configuredRedirect: configuredRedirect || null,
      siteUrl,
      reason,
      authError: error,
    }));

    throw new ApiRouteError({
      status: 500,
      code: "PASSWORD_RESET_EMAIL_FAILED",
      message,
      details: {
        reason,
      },
    });
  }
}

export async function lockUserByAdmin(
  service: SupabaseClient,
  input: {
    adminUserId: string;
    targetUserId: string;
    reason?: string;
    ip?: string;
    userAgent?: string;
  },
): Promise<void> {
  const { error } = await service
    .from("app_user_profiles")
    .update({
      is_locked: true,
      status: "locked",
      locked_at: nowIso(),
      lock_reason: input.reason ?? "admin_lock",
      updated_by: input.adminUserId,
      updated_at: nowIso(),
    })
    .eq("id", input.targetUserId);

  if (error) {
    throw new ApiRouteError({
      status: 500,
      code: "USER_LOCK_FAILED",
      message: "No se pudo bloquear el usuario.",
      details: error,
    });
  }

  await logSecurityEvent(service, {
    userId: input.targetUserId,
    actorUserId: input.adminUserId,
    eventType: "user_locked_by_admin",
    metadata: {
      reason: input.reason ?? "admin_lock",
    },
    ip: input.ip,
    userAgent: input.userAgent,
  });

  await logInfo({
    source: "admin.users",
    eventType: "admin_user_updated",
    message: "Usuario bloqueado por admin.",
    userId: input.adminUserId,
    metadata: {
      action: "lock",
      target_user_id: input.targetUserId,
      reason: input.reason ?? "admin_lock",
    },
  });
}

export async function unlockUserByAdmin(
  service: SupabaseClient,
  input: {
    adminUserId: string;
    targetUserId: string;
    email: string;
    ip?: string;
    userAgent?: string;
  },
): Promise<void> {
  const { error } = await service
    .from("app_user_profiles")
    .update({
      is_locked: false,
      failed_login_attempts: 0,
      locked_at: null,
      lock_reason: null,
      status: "pending_password_reset",
      password_reset_required: true,
      updated_by: input.adminUserId,
      updated_at: nowIso(),
    })
    .eq("id", input.targetUserId);

  if (error) {
    throw new ApiRouteError({
      status: 500,
      code: "USER_UNLOCK_FAILED",
      message: "No se pudo desbloquear el usuario.",
      details: error,
    });
  }

  await sendPasswordSetupOrResetEmail(service, input.email);

  await logSecurityEvent(service, {
    userId: input.targetUserId,
    actorUserId: input.adminUserId,
    eventType: "user_unlocked_by_admin",
    ip: input.ip,
    userAgent: input.userAgent,
  });

  await logSecurityEvent(service, {
    userId: input.targetUserId,
    actorUserId: input.adminUserId,
    eventType: "admin_forced_password_reset",
    metadata: {
      reason: "unlock_requires_reset",
    },
    ip: input.ip,
    userAgent: input.userAgent,
  });

  await logInfo({
    source: "admin.users",
    eventType: "admin_user_updated",
    message: "Usuario desbloqueado por admin.",
    userId: input.adminUserId,
    metadata: {
      action: "unlock",
      target_user_id: input.targetUserId,
      reset_sent: true,
    },
  });
}

export async function deactivateUserByAdmin(
  service: SupabaseClient,
  input: {
    adminUserId: string;
    targetUserId: string;
    ip?: string;
    userAgent?: string;
  },
): Promise<void> {
  const { error } = await service
    .from("app_user_profiles")
    .update({
      is_active: false,
      status: "inactive",
      is_locked: true,
      lock_reason: "deactivated",
      locked_at: nowIso(),
      updated_by: input.adminUserId,
      updated_at: nowIso(),
    })
    .eq("id", input.targetUserId);

  if (error) {
    throw new ApiRouteError({
      status: 500,
      code: "USER_DEACTIVATE_FAILED",
      message: "No se pudo desactivar el usuario.",
      details: error,
    });
  }

  await logSecurityEvent(service, {
    userId: input.targetUserId,
    actorUserId: input.adminUserId,
    eventType: "user_deactivated",
    ip: input.ip,
    userAgent: input.userAgent,
  });

  await logInfo({
    source: "admin.users",
    eventType: "admin_user_updated",
    message: "Usuario desactivado por admin.",
    userId: input.adminUserId,
    metadata: {
      action: "deactivate",
      target_user_id: input.targetUserId,
    },
  });
}

export async function deleteUserByAdmin(
  service: SupabaseClient,
  input: {
    adminUserId: string;
    targetUserId: string;
    targetRole: AppRole;
    targetEmail: string | null;
    ip?: string;
    userAgent?: string;
  },
): Promise<void> {
  const { error: deleteAuthError } = await service.auth.admin.deleteUser(input.targetUserId);

  if (deleteAuthError) {
    throw new ApiRouteError({
      status: 500,
      code: "USER_DELETE_AUTH_FAILED",
      message: "No se pudo eliminar el usuario en Auth.",
      details: deleteAuthError,
    });
  }

  const { error: deleteProfileError } = await service
    .from("app_user_profiles")
    .delete()
    .eq("id", input.targetUserId);

  if (deleteProfileError) {
    throw new ApiRouteError({
      status: 500,
      code: "USER_DELETE_PROFILE_FAILED",
      message: "No se pudo limpiar el perfil interno del usuario eliminado.",
      details: deleteProfileError,
    });
  }

  await logSecurityEvent(service, {
    actorUserId: input.adminUserId,
    eventType: "user_deleted",
    metadata: {
      target_user_id: input.targetUserId,
      target_role: input.targetRole,
      target_email_masked: maskEmail(input.targetEmail),
    },
    ip: input.ip,
    userAgent: input.userAgent,
  });

  await logInfo({
    source: "admin.users",
    eventType: "admin_user_updated",
    message: "Usuario eliminado por admin.",
    userId: input.adminUserId,
    metadata: {
      action: "delete",
      target_user_id: input.targetUserId,
      target_role: input.targetRole,
      target_email_masked: maskEmail(input.targetEmail),
    },
  });
}

export async function activateUserByAdmin(
  service: SupabaseClient,
  input: {
    adminUserId: string;
    target: AppUserProfileSecurity;
    targetUserId: string;
    ip?: string;
    userAgent?: string;
  },
): Promise<void> {
  const governed = isGovernedPasswordRole(input.target.role);

  const status =
    governed && !input.target.password_updated_at ? "pending_password_setup" : "active";

  const updates = {
    is_active: true,
    status,
    password_reset_required: governed ? !input.target.password_updated_at : false,
    is_locked: false,
    failed_login_attempts: 0,
    locked_at: null,
    lock_reason: null,
    updated_by: input.adminUserId,
    updated_at: nowIso(),
  };

  const { error } = await service.from("app_user_profiles").update(updates).eq("id", input.targetUserId);

  if (error) {
    throw new ApiRouteError({
      status: 500,
      code: "USER_ACTIVATE_FAILED",
      message: "No se pudo activar el usuario.",
      details: error,
    });
  }

  await logSecurityEvent(service, {
    userId: input.targetUserId,
    actorUserId: input.adminUserId,
    eventType: "user_activated",
    ip: input.ip,
    userAgent: input.userAgent,
  });

  await logInfo({
    source: "admin.users",
    eventType: "admin_user_updated",
    message: "Usuario activado por admin.",
    userId: input.adminUserId,
    metadata: {
      action: "activate",
      target_user_id: input.targetUserId,
      governed_role: governed,
      status,
    },
  });
}

export async function forcePasswordResetByAdmin(
  service: SupabaseClient,
  input: {
    adminUserId: string;
    targetUserId: string;
    email: string;
    ip?: string;
    userAgent?: string;
  },
): Promise<void> {
  const { error } = await service
    .from("app_user_profiles")
    .update({
      password_reset_required: true,
      status: "pending_password_reset",
      updated_by: input.adminUserId,
      updated_at: nowIso(),
    })
    .eq("id", input.targetUserId);

  if (error) {
    throw new ApiRouteError({
      status: 500,
      code: "FORCE_PASSWORD_RESET_FAILED",
      message: "No se pudo marcar reset obligatorio.",
      details: error,
    });
  }

  await sendPasswordSetupOrResetEmail(service, input.email);

  await logSecurityEvent(service, {
    userId: input.targetUserId,
    actorUserId: input.adminUserId,
    eventType: "admin_forced_password_reset",
    ip: input.ip,
    userAgent: input.userAgent,
  });

  await logInfo({
    source: "admin.users",
    eventType: "admin_user_updated",
    message: "Reset de contrasena forzado por admin.",
    userId: input.adminUserId,
    metadata: {
      action: "force_password_reset",
      target_user_id: input.targetUserId,
    },
  });
}

export function normalizeAdminUserRow(input: {
  profile: AppUserProfileSecurity;
  email: string | null;
}) {
  const daysUntilExpiration = getDaysUntilExpiration(input.profile.password_expires_at);

  return {
    id: input.profile.id,
    fullName: input.profile.full_name,
    email: input.email,
    role: input.profile.role,
    status: input.profile.status,
    isActive: input.profile.is_active,
    isLocked: input.profile.is_locked,
    securityState: mapSecurityStatus(input.profile),
    lastLoginAt: input.profile.last_login_at,
    passwordUpdatedAt: input.profile.password_updated_at,
    passwordExpiresAt: input.profile.password_expires_at,
    passwordResetRequired: input.profile.password_reset_required,
    failedLoginAttempts: input.profile.failed_login_attempts,
    daysUntilExpiration,
    isLegacyRole: input.profile.role === LEGACY_AGENT_ROLE,
  };
}

export async function loadTargetUserOrThrow(
  service: SupabaseClient,
  authSchemaClient: SupabaseClient,
  userId: string,
): Promise<{ profile: AppUserProfileSecurity; email: string | null }> {
  const profile = await getProfileByUserId(service, userId);

  if (!profile) {
    throw notFound("Usuario no encontrado.");
  }

  let authUser: { id: string; email: string | null } | null = null;
  try {
    authUser = await getAuthUserById(authSchemaClient, userId);
  } catch (error) {
    console.warn(
      "Auth user lookup failed in loadTargetUserOrThrow. Continuing with profile only.",
      redactSensitiveData({ userId, error }),
    );
  }

  return {
    profile,
    email: authUser?.email ?? null,
  };
}

export function makeTemporaryPassword(): string {
  return `Tmp#${randomUUID()}!`;
}

export async function ensureRoleTransitionAllowed(
  service: SupabaseClient,
  input: {
    adminUserId: string;
    target: AppUserProfileSecurity;
    newRole: AppRole;
  },
): Promise<void> {
  if (input.newRole === LEGACY_AGENT_ROLE) {
    throw conflict("No se permite crear o asignar rol agent en logica nueva.");
  }

  if (input.target.id === input.adminUserId && input.target.role === "admin" && input.newRole !== "admin") {
    throw conflict("Un admin no puede degradarse a si mismo.");
  }

  if (input.target.role === "admin" && input.newRole !== "admin") {
    await ensureNotLastActiveAdmin(service, input.target);
  }
}

export async function patchPasswordPolicy(
  service: SupabaseClient,
  input: {
    adminUserId: string;
    payload: z.infer<typeof policyUpdateSchema>;
    ip?: string;
    userAgent?: string;
  },
): Promise<void> {
  if (input.payload.password_history_keep_count < input.payload.password_history_check_count) {
    throw conflict("password_history_keep_count debe ser >= password_history_check_count.");
  }

  if (input.payload.expiration_warning_days > input.payload.password_expiration_days) {
    throw conflict("expiration_warning_days no puede ser mayor que password_expiration_days.");
  }

  const policy = await getActivePasswordPolicy(service);

  const { error } = await service
    .from("app_security_password_policy")
    .update({
      ...input.payload,
      updated_by: input.adminUserId,
      updated_at: nowIso(),
    })
    .eq("id", policy.id);

  if (error) {
    throw new ApiRouteError({
      status: 500,
      code: "PASSWORD_POLICY_UPDATE_FAILED",
      message: "No se pudo actualizar la politica.",
      details: error,
    });
  }

  await logSecurityEvent(service, {
    actorUserId: input.adminUserId,
    eventType: "password_policy_updated",
    metadata: {
      policy_id: policy.id,
      updates: input.payload,
    },
    ip: input.ip,
    userAgent: input.userAgent,
  });

  await logInfo({
    source: "admin.password_policy",
    eventType: "password_policy_changed",
    message: "Politica de contrasena actualizada por admin.",
    userId: input.adminUserId,
    metadata: {
      action: "patch",
      policy_id: policy.id,
      updates: input.payload,
    },
  });
}

export async function resetPasswordPolicyToDefaults(
  service: SupabaseClient,
  input: {
    adminUserId: string;
    ip?: string;
    userAgent?: string;
  },
): Promise<void> {
  const defaults = {
    minimum_length: 8,
    minimum_uppercase: 1,
    minimum_lowercase: 1,
    minimum_numbers: 1,
    minimum_symbols: 1,
    password_history_check_count: 3,
    password_history_keep_count: 5,
    password_expiration_days: 90,
    expiration_warning_days: 7,
    failed_login_lock_enabled: true,
    max_failed_login_attempts: 3,
    hash_algorithm: "argon2id",
  };

  const policy = await getActivePasswordPolicy(service);

  const { error } = await service
    .from("app_security_password_policy")
    .update({
      ...defaults,
      updated_by: input.adminUserId,
      updated_at: nowIso(),
    })
    .eq("id", policy.id);

  if (error) {
    throw new ApiRouteError({
      status: 500,
      code: "PASSWORD_POLICY_RESET_FAILED",
      message: "No se pudo reiniciar la politica por defecto.",
      details: error,
    });
  }

  await logSecurityEvent(service, {
    actorUserId: input.adminUserId,
    eventType: "password_policy_updated",
    metadata: {
      policy_id: policy.id,
      source: "reset_defaults",
      defaults,
    },
    ip: input.ip,
    userAgent: input.userAgent,
  });

  await logInfo({
    source: "admin.password_policy",
    eventType: "password_policy_changed",
    message: "Politica de contrasena restablecida por admin.",
    userId: input.adminUserId,
    metadata: {
      action: "reset_defaults",
      policy_id: policy.id,
    },
  });
}

export async function forceResetUsersByPolicy(
  service: SupabaseClient,
  input: {
    adminUserId: string;
    ip?: string;
    userAgent?: string;
  },
): Promise<number> {
  const { data: targets, error: targetError } = await service
    .from("app_user_profiles")
    .select("id, role, is_active, status")
    .in("role", ["admin", "user"])
    .eq("is_active", true)
    .neq("status", "inactive");

  if (targetError) {
    throw new ApiRouteError({
      status: 500,
      code: "POLICY_FORCE_RESET_LOAD_FAILED",
      message: "No se pudo cargar usuarios para reset masivo.",
      details: targetError,
    });
  }

  const ids = (targets ?? []).map((row) => String((row as { id: string }).id));

  if (ids.length > 0) {
    const { error } = await service
      .from("app_user_profiles")
      .update({
        password_reset_required: true,
        status: "pending_password_reset",
        updated_by: input.adminUserId,
        updated_at: nowIso(),
      })
      .in("id", ids);

    if (error) {
      throw new ApiRouteError({
        status: 500,
        code: "POLICY_FORCE_RESET_UPDATE_FAILED",
        message: "No se pudo aplicar reset obligatorio por politica.",
        details: error,
      });
    }
  }

  await logSecurityEvent(service, {
    actorUserId: input.adminUserId,
    eventType: "password_policy_force_reset_triggered",
    metadata: {
      affected_users: ids.length,
      target_roles: ["admin", "user"],
    },
    ip: input.ip,
    userAgent: input.userAgent,
  });

  await logInfo({
    source: "admin.password_policy",
    eventType: "password_policy_changed",
    message: "Reset masivo de contrasena ejecutado por politica.",
    userId: input.adminUserId,
    metadata: {
      action: "force_reset_users",
      affected_users: ids.length,
      target_roles: ["admin", "user"],
    },
  });

  return ids.length;
}

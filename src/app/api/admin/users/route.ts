import { z } from "zod";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { ApiRouteError, handleRouteError, ok, badRequest } from "@/server/api/http";
import { logAdminApiError } from "@/server/observability/admin-api";
import { logInfo } from "@/server/observability/logger";
import { assertJsonRequest, assertTrustedOrigin } from "@/server/security/request-guards";
import {
  buildAdminUserCreatePayload,
  createAdminUserSchema,
  ensureUniqueEmailOrThrow,
  getAuthUserById,
  getAuthUsersByIds,
  makeTemporaryPassword,
  normalizeAdminUserRow,
  requireAdminSecurityContext,
  sendPasswordSetupOrResetEmail,
} from "@/server/security/admin";
import {
  getProfileByUserId,
  getRequestIp,
  getRequestUserAgent,
  logSecurityEvent,
  normalizeEmail,
} from "@/server/security";

const querySchema = z.object({
  search: z.string().trim().optional(),
  role: z.string().trim().optional(),
  status: z.string().trim().optional(),
});

export const runtime = "nodejs";

async function rollbackCreatedAdminUser(service: ReturnType<typeof createSupabaseServiceClient>, userId: string) {
  const rollbackDetails: Array<{ step: string; details: unknown }> = [];

  const { error: deleteAuthError } = await service.auth.admin.deleteUser(userId);
  if (deleteAuthError) {
    rollbackDetails.push({
      step: "delete_auth_user",
      details: deleteAuthError,
    });
  }

  const { error: deleteProfileError } = await service.from("app_user_profiles").delete().eq("id", userId);
  if (deleteProfileError) {
    rollbackDetails.push({
      step: "delete_profile",
      details: deleteProfileError,
    });
  }

  if (rollbackDetails.length > 0) {
    throw new ApiRouteError({
      status: 500,
      code: "USER_CREATE_ROLLBACK_FAILED",
      message: "Fallo el rollback de usuario tras error de correo.",
      details: rollbackDetails,
    });
  }
}

export async function GET(request: Request) {
  let adminUserId: string | null = null;

  try {
    const { user } = await requireAdminSecurityContext();
    adminUserId = user.id;

    const url = new URL(request.url);
    const params = querySchema.parse({
      search: url.searchParams.get("search") ?? undefined,
      role: url.searchParams.get("role") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    });

    const service = createSupabaseServiceClient();
    let query = service
      .from("app_user_profiles")
      .select(
        "id, role, full_name, is_active, status, failed_login_attempts, is_locked, locked_at, lock_reason, last_login_at, password_updated_at, password_expires_at, password_reset_required, password_expired_at, invitation_sent_at, invitation_accepted_at, created_by, updated_by",
      )
      .order("created_at", { ascending: false });

    if (params.role) {
      query = query.eq("role", params.role);
    }

    if (params.status) {
      query = query.eq("status", params.status);
    }

    if (params.search) {
      query = query.ilike("full_name", `%${params.search}%`);
    }

    const { data: profiles, error } = await query;

    if (error) {
      throw badRequest("No se pudo obtener listado de usuarios.", error);
    }

    const authSchemaClient = createSupabaseServiceClient("auth");
    const ids = (profiles ?? []).map((profile) => profile.id);
    const authUsers = await getAuthUsersByIds(authSchemaClient, ids);
    const emailByUserId = new Map(authUsers.map((row) => [row.id, row.email]));

    const normalized = (profiles ?? [])
      .filter((profile) => {
        if (!params.search) {
          return true;
        }

        const search = params.search.toLowerCase();
        const fullName = String(profile.full_name ?? "").toLowerCase();
        const email = String(emailByUserId.get(profile.id) ?? "").toLowerCase();

        return fullName.includes(search) || email.includes(search);
      })
      .map((profile) =>
        normalizeAdminUserRow({
          profile,
          email: emailByUserId.get(profile.id) ?? null,
        }),
      );

    return ok({
      users: normalized,
      total: normalized.length,
    });
  } catch (error) {
    await logAdminApiError({
      request,
      route: "GET /api/admin/users",
      error,
      userId: adminUserId,
    });

    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);
    assertJsonRequest(request);

    const { user: adminUser } = await requireAdminSecurityContext();
    const payload = createAdminUserSchema.parse(await request.json());

    const service = createSupabaseServiceClient();
    const authSchemaClient = createSupabaseServiceClient("auth");
    const email = normalizeEmail(payload.email);
    const ip = getRequestIp(request);
    const userAgent = getRequestUserAgent(request);

    await ensureUniqueEmailOrThrow(authSchemaClient, email);

    const { data: createdAuthUser, error: createAuthError } = await service.auth.admin.createUser({
      email,
      password: makeTemporaryPassword(),
      email_confirm: true,
      user_metadata: {
        full_name: payload.fullName,
      },
    });

    if (createAuthError || !createdAuthUser.user) {
      throw badRequest("No se pudo crear usuario en Auth.", createAuthError);
    }

    const profilePayload = buildAdminUserCreatePayload({
      role: payload.role,
      fullName: payload.fullName,
      adminUserId: adminUser.id,
    });

    const { error: insertProfileError } = await service.from("app_user_profiles").insert({
      id: createdAuthUser.user.id,
      ...profilePayload,
    });

    if (insertProfileError) {
      throw badRequest("No se pudo crear perfil interno.", insertProfileError);
    }

    const createdProfile = await getProfileByUserId(service, createdAuthUser.user.id);

    if (!createdProfile) {
      throw badRequest("No se pudo recuperar el perfil creado.");
    }

    if (payload.role === "admin" || payload.role === "user") {
      try {
        await sendPasswordSetupOrResetEmail(service, email);
      } catch (error) {
        await rollbackCreatedAdminUser(service, createdAuthUser.user.id);
        throw error;
      }

      await logSecurityEvent(service, {
        userId: createdAuthUser.user.id,
        actorUserId: adminUser.id,
        eventType: "invitation_sent",
        ip,
        userAgent,
      });
    }

    await logSecurityEvent(service, {
      userId: createdAuthUser.user.id,
      actorUserId: adminUser.id,
      eventType: "user_created",
      metadata: {
        role: payload.role,
      },
      ip,
      userAgent,
    });

    await logInfo({
      source: "admin.users",
      eventType: "admin_user_updated",
      message: "Usuario creado por admin.",
      userId: adminUser.id,
      metadata: {
        action: "create",
        target_user_id: createdAuthUser.user.id,
        target_role: payload.role,
      },
    });

    const authUser = await getAuthUserById(authSchemaClient, createdAuthUser.user.id);

    return ok(
      {
        user: normalizeAdminUserRow({
          profile: createdProfile,
          email: authUser?.email ?? null,
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    await logAdminApiError({
      request,
      route: "POST /api/admin/users",
      error,
    });

    return handleRouteError(error);
  }
}

import "server-only";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logWarn } from "@/server/observability/logger";

export async function requireAdminPageAccess(source: string): Promise<{ userId: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("app_user_profiles")
    .select("role, is_active, status")
    .eq("id", user.id)
    .maybeSingle<{
      role: string;
      is_active: boolean;
      status: string;
    }>();

  if (!profile || profile.role !== "admin" || !profile.is_active || profile.status === "inactive") {
    await logWarn({
      source,
      eventType: "admin_access_denied",
      message: "Acceso denegado a pagina admin",
      userId: user.id,
      metadata: {
        role: profile?.role ?? null,
        is_active: profile?.is_active ?? null,
        status: profile?.status ?? null,
      },
    });

    redirect("/auth/access-denied");
  }

  return { userId: user.id };
}

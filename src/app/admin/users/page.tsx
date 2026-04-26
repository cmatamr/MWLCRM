import { AdminUsersClient } from "@/app/admin/users/users-client";
import { requireAdminPageAccess } from "@/server/security/admin-page-access";

export default async function AdminUsersPage() {
  await requireAdminPageAccess("admin.users.page");

  return (
    <section className="space-y-5">
      <div className="dashboard-card-3d p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Administracion</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Usuarios</h1>
        <p className="mt-2 text-sm text-slate-600">
          Gestion de usuarios, seguridad y estado operativo del CRM.
        </p>
      </div>

      <AdminUsersClient />
    </section>
  );
}

import { AdminLogsClient } from "@/app/admin/logs/logs-client";
import { requireAdminPageAccess } from "@/server/security/admin-page-access";

export default async function AdminLogsPage() {
  await requireAdminPageAccess("admin.logs.page");

  return (
    <section className="space-y-5">
      <div className="dashboard-card-3d p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Administracion</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Observabilidad</h1>
        <p className="mt-2 text-sm text-slate-600">
          Explora eventos de aplicación, errores y trazabilidad operativa del sistema.
        </p>
      </div>

      <AdminLogsClient />
    </section>
  );
}

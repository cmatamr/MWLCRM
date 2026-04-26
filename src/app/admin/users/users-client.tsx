"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useModalDismiss } from "@/components/ui/modal-dismiss";
import { TableEmptyStateRow } from "@/components/ui/state-display";
import { StatusBadge } from "@/components/ui/status-badge";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";

type AdminUserRow = {
  id: string;
  fullName: string;
  email: string | null;
  role: string;
  status: string;
  securityState: string;
  lastLoginAt: string | null;
  passwordUpdatedAt: string | null;
  passwordExpiresAt: string | null;
  failedLoginAttempts: number;
};

type SecurityEvent = {
  id: string;
  event_type: string;
  created_at: string;
  event_metadata: Record<string, unknown>;
};

type UserListResponse = {
  success: boolean;
  data?: {
    users: AdminUserRow[];
    total: number;
  };
  error?: {
    message?: string;
  };
};

const ROLE_OPTIONS = ["admin", "user", "service"] as const;

const STATUS_OPTIONS = [
  "active",
  "inactive",
  "locked",
  "pending_password_reset",
  "password_expired",
] as const;

const SECURITY_STATE_LABELS: Record<string, string> = {
  ok: "OK",
  reset_required: "Reset requerido",
  password_expired: "Contrasena vencida",
  warning: "Advertencia",
  unknown: "Sin estado",
};

function asLocalDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatRoleLabel(role: string): string {
  return role === "service" ? "service" : role;
}

function formatStatusLabel(status: string): string {
  if (!status) return "Sin estado";
  return status.replaceAll("_", " ");
}

function formatSecurityStateLabel(securityState: string): string {
  return SECURITY_STATE_LABELS[securityState] ?? securityState.replaceAll("_", " ");
}

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (["active"].includes(status)) return "success";
  if (["pending_password_reset", "password_expired"].includes(status)) return "warning";
  if (["inactive", "locked"].includes(status)) return "danger";
  return "neutral";
}

function securityTone(securityState: string): "success" | "warning" | "danger" | "neutral" {
  if (["ok"].includes(securityState)) return "success";
  if (["reset_required", "password_expired", "warning"].includes(securityState)) return "warning";
  return "neutral";
}

type UserStateAction = {
  action: "activate" | "lock" | "unlock";
  label: string;
  variant: "default" | "outline";
  className?: string;
};

function getUserStateAction(user: AdminUserRow): UserStateAction {
  if (user.status === "inactive") {
    return {
      action: "activate",
      label: "Activar",
      variant: "default",
    };
  }

  if (user.status === "locked") {
    return {
      action: "unlock",
      label: "Desbloquear",
      variant: "default",
    };
  }

  return {
    action: "lock",
    label: "Bloquear",
    variant: "outline",
    className: "border-rose-200 text-rose-700 hover:bg-rose-50",
  };
}

export function AdminUsersClient() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<(typeof ROLE_OPTIONS)[number]>("user");

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState<(typeof ROLE_OPTIONS)[number]>("user");
  const [manageView, setManageView] = useState<"profile" | "audit">("profile");
  const [userPendingDelete, setUserPendingDelete] = useState<AdminUserRow | null>(null);
  const [isManageDiscardOpen, setIsManageDiscardOpen] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const managedUser = useMemo(
    () => users.find((user) => user.id === editingUserId) ?? null,
    [editingUserId, users],
  );

  async function loadUsers() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const response = await fetch(`/api/admin/users?${params.toString()}`);
      const payload = (await response.json()) as UserListResponse;

      if (!response.ok || !payload.success) {
        setError(payload.error?.message ?? "No se pudo cargar usuarios.");
        setLoading(false);
        return;
      }

      setUsers(payload.data?.users ?? []);
      setLoading(false);
    } catch {
      setError("No se pudo cargar usuarios.");
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createUser() {
    if (!newFullName.trim() || !newEmail.trim()) {
      setError("Nombre y correo son obligatorios.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: newFullName, email: newEmail, role: newRole }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        setError(payload?.error?.message ?? "No se pudo crear usuario.");
        setSaving(false);
        return;
      }

      setNewFullName("");
      setNewEmail("");
      setNewRole("user");
      await loadUsers();
      setSaving(false);
    } catch {
      setError("No se pudo crear usuario.");
      setSaving(false);
    }
  }

  function openManageModal(user: AdminUserRow, initialView: "profile" | "audit" = "profile") {
    setEditingUserId(user.id);
    setEditFullName(user.fullName);
    setSelectedUserId(user.id);
    setManageView(initialView);

    if (ROLE_OPTIONS.includes(user.role as (typeof ROLE_OPTIONS)[number])) {
      setEditRole(user.role as (typeof ROLE_OPTIONS)[number]);
    } else {
      setEditRole("user");
    }

    if (initialView === "audit") {
      void loadEvents(user.id);
    }
  }

  function closeManageModal() {
    setEditingUserId(null);
    setManageView("profile");
  }

  const hasManageUnsavedChanges =
    managedUser != null &&
    manageView === "profile" &&
    (editFullName.trim() !== managedUser.fullName.trim() || editRole !== managedUser.role);

  function requestCloseManageModal() {
    if (saving) {
      return;
    }

    if (hasManageUnsavedChanges) {
      setIsManageDiscardOpen(true);
      return;
    }

    closeManageModal();
  }

  const { onBackdropMouseDown: onManageBackdropMouseDown } = useModalDismiss({
    isOpen: managedUser != null,
    onClose: requestCloseManageModal,
    isDisabled: saving,
  });

  const { onBackdropMouseDown: onDeleteBackdropMouseDown } = useModalDismiss({
    isOpen: userPendingDelete != null,
    onClose: () => setUserPendingDelete(null),
    isDisabled: saving,
  });

  async function saveEdit() {
    if (!editingUserId) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${editingUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: editFullName, role: editRole }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        setError(payload?.error?.message ?? "No se pudo editar usuario.");
        setSaving(false);
        return;
      }

      setEditingUserId(null);
      await loadUsers();
      setSaving(false);
    } catch {
      setError("No se pudo editar usuario.");
      setSaving(false);
    }
  }

  async function runAction(userId: string, action: string) {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/${action}`, { method: "POST" });
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        setError(payload?.error?.message ?? "No se pudo ejecutar accion.");
        setSaving(false);
        return;
      }

      await loadUsers();
      setSaving(false);
    } catch {
      setError("No se pudo ejecutar accion.");
      setSaving(false);
    }
  }

  async function deleteUser(user: AdminUserRow) {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}/delete`, { method: "POST" });
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        setError(payload?.error?.message ?? "No se pudo eliminar usuario.");
        setSaving(false);
        return;
      }

      setUserPendingDelete(null);
      setEditingUserId(null);
      await loadUsers();
      setSaving(false);
    } catch {
      setError("No se pudo eliminar usuario.");
      setSaving(false);
    }
  }

  async function loadEvents(userId: string) {
    setEventsLoading(true);
    setSelectedUserId(userId);

    try {
      const response = await fetch(`/api/admin/users/${userId}/security-events`);
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        setError(payload?.error?.message ?? "No se pudo cargar auditoria.");
        setEvents([]);
        setEventsLoading(false);
        return;
      }

      setEvents(payload.data?.events ?? []);
      setEventsLoading(false);
    } catch {
      setError("No se pudo cargar auditoria.");
      setEvents([]);
      setEventsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)]">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">Usuarios</p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Crear usuario</h2>
          <p className="text-sm text-muted-foreground">
            Alta manual para cuentas operativas y administrativas del CRM.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Nombre completo
            </span>
            <input
              value={newFullName}
              onChange={(event) => setNewFullName(event.target.value)}
              placeholder="Nombre completo"
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Correo
            </span>
            <input
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="correo@empresa.com"
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Rol
            </span>
            <select
              value={newRole}
              onChange={(event) => setNewRole(event.target.value as (typeof ROLE_OPTIONS)[number])}
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary"
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <Button type="button" onClick={() => void createUser()} disabled={saving} className="w-full">
              {saving ? "Guardando..." : "Crear usuario"}
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_38px_68px_-30px_rgba(2,6,23,0.28),0_16px_34px_-16px_rgba(2,6,23,0.2)]">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">Administracion</p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Panel de usuarios</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Consulta estado de cuenta, controles de seguridad y acciones administrativas.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_auto]">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Buscar usuario
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por usuario o email"
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Rol
            </span>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary"
            >
              <option value="all">Todos</option>
              <option value="admin">admin</option>
              <option value="user">user</option>
              <option value="service">service</option>
              <option value="agent">legacy</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Estado
            </span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary"
            >
              <option value="all">Todos</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <Button type="button" onClick={() => void loadUsers()} disabled={loading} className="w-full">
              {loading ? "Cargando..." : "Aplicar filtros"}
            </Button>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-[24px] border border-border/70">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] divide-y divide-border/70 text-center">
              <caption className="sr-only">
                Tabla de usuarios con email, estado, ultimo login, intentos fallidos y edicion.
              </caption>
              <thead className="bg-muted/40 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 text-center font-medium">Usuario</th>
                  <th scope="col" className="px-4 py-3 text-center font-medium">Email</th>
                  <th scope="col" className="px-4 py-3 text-center font-medium">Estado</th>
                  <th scope="col" className="px-4 py-3 text-center font-medium">Ultimo login</th>
                  <th scope="col" className="px-4 py-3 text-center font-medium">Intento fallido</th>
                  <th scope="col" className="px-4 py-3 text-center font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-white">
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id} className="text-sm text-slate-700">
                      <td className="px-4 py-4 align-top text-center">
                        <p className="font-medium text-slate-950">{user.fullName}</p>
                      </td>
                      <td className="px-4 py-4 align-top text-center">{user.email ?? "-"}</td>
                      <td className="px-4 py-4 align-top text-center">
                        <StatusBadge tone={statusTone(user.status)}>
                          {formatStatusLabel(user.status)}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-4 align-top text-center">{asLocalDate(user.lastLoginAt)}</td>
                      <td className="px-4 py-4 align-top text-center font-medium text-slate-950">
                        {user.failedLoginAttempts}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="mx-auto flex max-w-[140px] items-center justify-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 rounded-full text-slate-500 hover:bg-white/80 hover:text-slate-900"
                            onClick={() => openManageModal(user)}
                            disabled={saving}
                            aria-label={`Editar usuario ${user.fullName}`}
                            title="Editar usuario"
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <TableEmptyStateRow
                    colSpan={6}
                    title="No hay usuarios para mostrar"
                    description="No encontramos resultados para los filtros actuales."
                    isLoading={loading}
                  />
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {managedUser
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-[2px]"
              role="dialog"
              aria-modal="true"
              aria-labelledby={`manage-user-title-${managedUser.id}`}
              onMouseDown={onManageBackdropMouseDown}
            >
              <div className="w-full max-w-5xl rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.2)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">Gestion</p>
                    <h3 id={`manage-user-title-${managedUser.id}`} className="text-2xl font-semibold tracking-tight text-slate-950">
                      {managedUser.fullName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Administra perfil, estado de seguridad y auditoria del usuario.
                    </p>
                    <p className="text-xs font-medium text-slate-500">ID: {managedUser.id}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full border border-border/70"
                    onClick={requestCloseManageModal}
                    aria-label="Cerrar ventana de gestion"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={manageView === "profile" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setManageView("profile")}
                  >
                    Perfil
                  </Button>
                  <Button
                    type="button"
                    variant={manageView === "audit" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setManageView("audit");
                      if (selectedUserId !== managedUser.id || events.length === 0) {
                        void loadEvents(managedUser.id);
                      }
                    }}
                  >
                    Auditoria
                  </Button>
                </div>

                {manageView === "profile" ? (
                  <>
                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border border-border/70 bg-slate-50/70 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Email</p>
                        <p className="mt-1 text-sm font-medium text-slate-950">{managedUser.email ?? "-"}</p>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-slate-50/70 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Estado</p>
                        <div className="mt-2">
                          <StatusBadge tone={statusTone(managedUser.status)}>
                            {formatStatusLabel(managedUser.status)}
                          </StatusBadge>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-slate-50/70 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Seguridad</p>
                        <div className="mt-2">
                          <StatusBadge tone={securityTone(managedUser.securityState)}>
                            {formatSecurityStateLabel(managedUser.securityState)}
                          </StatusBadge>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-slate-50/70 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Intentos fallidos
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">{managedUser.failedLoginAttempts}</p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                      <label className="space-y-2 md:col-span-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Nombre completo
                        </span>
                        <input
                          value={editFullName}
                          onChange={(event) => setEditFullName(event.target.value)}
                          className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Rol
                        </span>
                        <select
                          value={editRole}
                          onChange={(event) => setEditRole(event.target.value as (typeof ROLE_OPTIONS)[number])}
                          className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary"
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button type="button" onClick={() => void saveEdit()} disabled={saving}>
                        {saving ? "Guardando..." : "Guardar cambios"}
                      </Button>
                      <Button type="button" variant="outline" onClick={requestCloseManageModal}>
                        Cerrar
                      </Button>
                    </div>

                    <div className="mt-5 rounded-2xl border border-border/70 bg-slate-50/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Acciones de seguridad
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(() => {
                          const stateAction = getUserStateAction(managedUser);
                          const canDeactivate = managedUser.status !== "inactive";
                          const canForceReset = Boolean(managedUser.email);

                          return (
                            <>
                              <Button
                                type="button"
                                variant={stateAction.variant}
                                size="sm"
                                className={`h-8 px-3 text-xs ${stateAction.className ?? ""}`}
                                onClick={() => void runAction(managedUser.id, stateAction.action)}
                                disabled={saving}
                              >
                                {stateAction.label}
                              </Button>
                              {canDeactivate ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-3 text-xs text-rose-700 hover:bg-rose-50"
                                  onClick={() => void runAction(managedUser.id, "deactivate")}
                                  disabled={saving}
                                >
                                  Desactivar
                                </Button>
                              ) : null}
                              {canForceReset ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-3 text-xs"
                                  onClick={() => void runAction(managedUser.id, "force-password-reset")}
                                  disabled={saving}
                                >
                                  Forzar reset
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 text-xs text-rose-700 hover:bg-rose-50"
                                onClick={() => setUserPendingDelete(managedUser)}
                                disabled={saving}
                              >
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                Eliminar usuario
                              </Button>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="mt-5 overflow-hidden rounded-[20px] border border-border/70">
                    <div className="max-h-[520px] overflow-auto">
                      <table className="w-full min-w-[780px] divide-y divide-border/70 text-left">
                        <thead className="bg-muted/40 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3 font-medium">Fecha</th>
                            <th className="px-4 py-3 font-medium">Evento</th>
                            <th className="px-4 py-3 font-medium">Metadata</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 bg-white">
                          {events.length > 0 ? (
                            events.map((event) => (
                              <tr key={event.id} className="text-sm text-slate-700">
                                <td className="px-4 py-4 align-top">{asLocalDate(event.created_at)}</td>
                                <td className="px-4 py-4 align-top font-medium text-slate-950">{event.event_type}</td>
                                <td className="px-4 py-4 align-top">
                                  <pre className="max-w-[540px] whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                                    {JSON.stringify(event.event_metadata ?? {}, null, 2)}
                                  </pre>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <TableEmptyStateRow
                              colSpan={3}
                              title={eventsLoading ? "Cargando auditoria" : "Sin eventos"}
                              description={
                                eventsLoading
                                  ? "Estamos consultando el historial de seguridad del usuario."
                                  : "Este usuario no tiene eventos de seguridad registrados."
                              }
                              isLoading={eventsLoading}
                            />
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}

      {userPendingDelete
        ? createPortal(
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/25 px-4 backdrop-blur-[2px]"
              role="dialog"
              aria-modal="true"
              aria-labelledby={`delete-user-title-${userPendingDelete.id}`}
              onMouseDown={onDeleteBackdropMouseDown}
            >
              <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
                    Confirmar accion
                  </p>
                  <h3
                    id={`delete-user-title-${userPendingDelete.id}`}
                    className="text-2xl font-semibold tracking-tight text-slate-950"
                  >
                    ¿Eliminar este usuario?
                  </h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Se eliminará permanentemente la cuenta de {userPendingDelete.fullName}.
                  </p>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setUserPendingDelete(null)}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void deleteUser(userPendingDelete)}
                    disabled={saving}
                    className="bg-rose-600 text-white hover:bg-rose-700"
                  >
                    {saving ? "Eliminando..." : "Eliminar usuario"}
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      <UnsavedChangesDialog
        isOpen={isManageDiscardOpen}
        onContinueEditing={() => setIsManageDiscardOpen(false)}
        onDiscardChanges={() => {
          setIsManageDiscardOpen(false);
          closeManageModal();
        }}
        isDisabled={saving}
      />
    </div>
  );
}

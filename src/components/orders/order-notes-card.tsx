"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useModalDismiss } from "@/components/ui/modal-dismiss";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { useCreateOrderActivity } from "@/hooks/use-create-order-activity";
import { useDeleteOrderActivity } from "@/hooks/use-delete-order-activity";
import { useUpdateOrderActivity } from "@/hooks/use-update-order-activity";
import { formatDateTime } from "@/lib/formatters";
import type { OrderDetail } from "@/server/services/orders/types";

type OrderNotesCardProps = {
  orderId: string;
  activities: OrderDetail["activities"];
};

type AddOrderNoteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  mode?: "create" | "edit";
  initialContent?: string;
  activityId?: string;
};

function AddOrderNoteModal({
  isOpen,
  onClose,
  orderId,
  mode = "create",
  initialContent = "",
  activityId,
}: AddOrderNoteModalProps) {
  const createActivityMutation = useCreateOrderActivity(orderId);
  const updateActivityMutation = useUpdateOrderActivity(orderId);
  const [content, setContent] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isDiscardChangesOpen, setIsDiscardChangesOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isSubmitting = createActivityMutation.isPending || updateActivityMutation.isPending;
  const isEditMode = mode === "edit";

  useEffect(() => {
    if (isOpen) {
      setContent(initialContent);
    } else {
      setContent("");
      setFormError(null);
    }
  }, [initialContent, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isOpen]);

  function handleClose() {
    if (isSubmitting) {
      return;
    }

    onClose();
  }

  const hasUnsavedChanges = content.trim() !== initialContent.trim();

  function requestClose() {
    if (isSubmitting) {
      return;
    }

    if (hasUnsavedChanges) {
      setIsDiscardChangesOpen(true);
      return;
    }

    handleClose();
  }

  const { onBackdropMouseDown } = useModalDismiss({
    isOpen,
    onClose: requestClose,
    isDisabled: isSubmitting,
  });

  async function handleSubmit() {
    setFormError(null);

    if (!content.trim()) {
      setFormError("Escribe una nota antes de guardar.");
      return;
    }

    try {
      if (isEditMode) {
        if (!activityId) {
          setFormError("No se pudo identificar la nota a editar.");
          return;
        }

        await updateActivityMutation.mutateAsync({
          activityId,
          activity: {
            content,
          },
        });
      } else {
        await createActivityMutation.mutateAsync({
          type: "note",
          content,
        });
      }

      onClose();
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message);
        return;
      }

      setFormError(isEditMode ? "No se pudo actualizar la nota." : "No se pudo guardar la nota.");
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 px-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-order-note-title"
      onMouseDown={onBackdropMouseDown}
    >
      <div className="w-full max-w-2xl rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
              Order activity
            </p>
            <div className="space-y-1">
              <h3 id="add-order-note-title" className="text-2xl font-semibold tracking-tight text-slate-950">
                {isEditMode ? "Editar nota" : "Agregar nota"}
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">
                {isEditMode
                  ? "Actualiza el contexto operativo o comercial asociado a esta orden."
                  : "Registra contexto operativo o comercial asociado a esta orden."}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-950">Contenido</span>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={6}
              placeholder="Escribe una nota interna para esta orden"
              disabled={isSubmitting}
              className="w-full rounded-[22px] border border-border bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted"
            />
          </label>

          {formError ? (
            <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {formError}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={requestClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting}>
              {isSubmitting
                ? isEditMode
                  ? "Guardando..."
                  : "Guardando..."
                : isEditMode
                  ? "Guardar cambios"
                  : "Guardar nota"}
            </Button>
          </div>
        </div>
      </div>

      <UnsavedChangesDialog
        isOpen={isDiscardChangesOpen}
        onContinueEditing={() => setIsDiscardChangesOpen(false)}
        onDiscardChanges={() => {
          setIsDiscardChangesOpen(false);
          handleClose();
        }}
        isDisabled={isSubmitting}
      />
    </div>
  );
}

function OrderNoteItem({
  orderId,
  activity,
}: {
  orderId: string;
  activity: OrderDetail["activities"][number];
}) {
  const deleteActivityMutation = useDeleteOrderActivity(orderId);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  async function handleDelete() {
    setDeleteError(null);

    try {
      await deleteActivityMutation.mutateAsync({
        activityId: activity.id,
      });
      setIsDeleteDialogOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        setDeleteError(error.message);
        return;
      }

      setDeleteError("No se pudo eliminar la nota.");
    }
  }

  function openDeleteDialog() {
    if (deleteActivityMutation.isPending) {
      return;
    }

    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  }

  function closeDeleteDialog() {
    if (deleteActivityMutation.isPending) {
      return;
    }

    setIsDeleteDialogOpen(false);
  }

  const { onBackdropMouseDown } = useModalDismiss({
    isOpen: isDeleteDialogOpen,
    onClose: closeDeleteDialog,
    isDisabled: deleteActivityMutation.isPending,
  });

  function openEditModal() {
    if (deleteActivityMutation.isPending) {
      return;
    }

    setDeleteError(null);
    setIsEditModalOpen(true);
  }

  return (
    <>
      <article className="rounded-[24px] border border-border/70 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
              Nota interna
            </p>
            {activity.createdBy ? (
              <p className="text-xs text-muted-foreground">Registrada por {activity.createdBy}</p>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">{formatDateTime(activity.createdAt)}</p>
        </div>

        <div className="mt-3 flex items-end justify-between gap-4">
          <p className="flex-1 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {activity.content ?? "Sin contenido"}
          </p>

          <div className="flex flex-col items-end gap-2">
            {deleteError ? (
              <p className="text-xs font-medium text-rose-700">{deleteError}</p>
            ) : null}

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={openEditModal}
                disabled={deleteActivityMutation.isPending}
                className="h-9 w-9 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Editar nota"
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={openDeleteDialog}
                disabled={deleteActivityMutation.isPending}
                className="h-9 w-9 rounded-full text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                aria-label="Eliminar nota"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-2 text-xs text-muted-foreground">
          {deleteActivityMutation.isPending ? "Eliminando..." : null}
        </div>
      </article>

      {isDeleteDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 px-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`delete-note-title-${activity.id}`}
          onMouseDown={onBackdropMouseDown}
        >
          <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
                Confirmar accion
              </p>
              <h3
                id={`delete-note-title-${activity.id}`}
                className="text-2xl font-semibold tracking-tight text-slate-950"
              >
                ¿Eliminar esta nota?
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Esta acción eliminará la nota interna de la orden de forma permanente.
              </p>
            </div>

            {deleteError ? (
              <p className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {deleteError}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={closeDeleteDialog}
                disabled={deleteActivityMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleteActivityMutation.isPending}
                className="bg-rose-600 text-white hover:bg-rose-700"
              >
                {deleteActivityMutation.isPending ? "Eliminando..." : "Eliminar nota"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <AddOrderNoteModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        orderId={orderId}
        mode="edit"
        initialContent={activity.content ?? ""}
        activityId={activity.id}
      />
    </>
  );
}

export function OrderNotesCard({ orderId, activities }: OrderNotesCardProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <>
      <section className="dashboard-card-3d overflow-hidden p-6 xl:min-h-[488px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
              Notes
            </p>
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                Notas internas
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Contexto operativo para seguimiento comercial, validaciones y producción.
              </p>
            </div>
          </div>

          <Button type="button" onClick={() => setIsAddModalOpen(true)}>
            Agregar nota
          </Button>
        </div>

        <div className="mt-6 space-y-4 rounded-[24px] border border-border/70 bg-slate-50/70 p-4">
          {activities.length > 0 ? (
            activities.map((activity) => (
              <OrderNoteItem key={activity.id} orderId={orderId} activity={activity} />
            ))
          ) : (
            <div className="rounded-[20px] border border-dashed border-border/80 bg-white/80 px-5 py-8 text-center xl:min-h-[288px] xl:flex xl:flex-col xl:items-center xl:justify-center">
              <p className="text-sm font-medium text-slate-700">
                Esta orden no tiene notas registradas todavía.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Usa `Agregar nota` para guardar contexto real de seguimiento interno.
              </p>
            </div>
          )}
        </div>
      </section>

      <AddOrderNoteModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        orderId={orderId}
      />
    </>
  );
}

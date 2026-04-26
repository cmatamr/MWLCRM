"use client";

import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { useModalDismiss } from "@/components/ui/modal-dismiss";

type UnsavedChangesDialogProps = {
  isOpen: boolean;
  onContinueEditing: () => void;
  onDiscardChanges: () => void;
  isDisabled?: boolean;
  title?: string;
  description?: string;
};

export function UnsavedChangesDialog({
  isOpen,
  onContinueEditing,
  onDiscardChanges,
  isDisabled = false,
  title = "Hay cambios sin guardar",
  description = "Si sales ahora, se perderan los cambios no guardados. ¿Deseas descartarlos?",
}: UnsavedChangesDialogProps) {
  const { onBackdropMouseDown } = useModalDismiss({
    isOpen,
    onClose: onContinueEditing,
    isDisabled,
  });

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-changes-title"
      onMouseDown={onBackdropMouseDown}
    >
      <div className="w-full max-w-md rounded-[24px] border border-white/80 bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
            Cambios no guardados
          </p>
          <h4 id="unsaved-changes-title" className="text-lg font-semibold text-slate-950">
            {title}
          </h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onContinueEditing} disabled={isDisabled}>
            Continuar editando
          </Button>
          <Button type="button" onClick={onDiscardChanges} disabled={isDisabled}>
            Descartar cambios
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

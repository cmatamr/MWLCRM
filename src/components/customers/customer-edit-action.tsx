"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";

import {
  COSTA_RICA_PHONE_PREFIX,
  formatCostaRicaPhoneVisual,
  getCostaRicaLocalPhoneDigits,
  isValidCustomerExternalId,
  normalizeCustomerExternalIdForStorage,
} from "@/domain/crm/customer-edit";
import type { CustomerDetail } from "@/server/services/customers/types";
import { useUpdateCustomer } from "@/hooks/use-update-customer";
import { Button } from "@/components/ui/button";
import { useModalDismiss } from "@/components/ui/modal-dismiss";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { formatChannelLabel } from "@/components/customers/customer-presenters";

type EditableCustomer = Pick<
  CustomerDetail,
  "id" | "displayName" | "externalId" | "primaryChannel" | "customerStatus"
>;

type CustomerEditActionProps = {
  customer: EditableCustomer;
};

type FormState = {
  externalId: string;
  displayName: string;
  customerStatus: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;
type TouchedState = Partial<Record<keyof FormState, boolean>>;

function createInitialFormState(customer: EditableCustomer): FormState {
  return {
    externalId:
      customer.primaryChannel === "wa"
        ? formatCostaRicaPhoneVisual(customer.externalId)
        : customer.externalId,
    displayName: customer.displayName ?? "",
    customerStatus: customer.customerStatus ?? "",
  };
}

function validateForm(form: FormState, customer: EditableCustomer): FormErrors {
  const errors: FormErrors = {};

  if (!isValidCustomerExternalId(form.externalId, customer.primaryChannel)) {
    errors.externalId =
      customer.primaryChannel === "wa"
        ? "Ingresa exactamente 8 dígitos para el teléfono."
        : "El identificador externo es obligatorio.";
  }

  return errors;
}

export function CustomerEditAction({ customer }: CustomerEditActionProps) {
  const router = useRouter();
  const updateCustomerMutation = useUpdateCustomer();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => createInitialFormState(customer));
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [touchedFields, setTouchedFields] = useState<TouchedState>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isDiscardChangesOpen, setIsDiscardChangesOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setForm(createInitialFormState(customer));
      setFormErrors({});
      setTouchedFields({});
      setFormError(null);
    }
  }, [customer, isOpen]);

  const validationErrors = useMemo(() => validateForm(form, customer), [customer, form]);
  const isWhatsappCustomer = customer.primaryChannel === "wa";

  function touchField(key: keyof FormState) {
    setTouchedFields((current) => ({
      ...current,
      [key]: true,
    }));
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
    setFormErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setFormError(null);
  }

  function handlePhoneChange(value: string) {
    updateField("externalId", formatCostaRicaPhoneVisual(value));
  }

  function handleClose() {
    if (updateCustomerMutation.isPending) {
      return;
    }

    setIsOpen(false);
  }

  const initialForm = createInitialFormState(customer);
  const hasUnsavedChanges =
    form.externalId.trim() !== initialForm.externalId.trim() ||
    form.displayName.trim() !== initialForm.displayName.trim() ||
    form.customerStatus.trim() !== initialForm.customerStatus.trim();

  function requestClose() {
    if (updateCustomerMutation.isPending) {
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
    isDisabled: updateCustomerMutation.isPending,
  });

  async function handleSubmit() {
    const nextErrors = validateForm(form, customer);
    setTouchedFields({
      externalId: true,
      displayName: true,
      customerStatus: true,
    });
    setFormErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      await updateCustomerMutation.mutateAsync({
        customerId: customer.id,
        input: {
          externalId:
            normalizeCustomerExternalIdForStorage(form.externalId, customer.primaryChannel) ??
            form.externalId.trim(),
          displayName: form.displayName.trim() || null,
          customerStatus: form.customerStatus.trim() || null,
        },
      });

      router.refresh();
      setIsOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message);
        return;
      }

      setFormError("No se pudo actualizar el customer.");
    }
  }

  const localPhoneDigits = getCostaRicaLocalPhoneDigits(form.externalId);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="h-8 w-8 shrink-0 rounded-full text-slate-500 hover:bg-white/80 hover:text-slate-900"
        aria-label="Editar cliente"
      >
        <Pencil className="size-4" />
      </Button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/25 px-4 py-10 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-customer-title"
          onMouseDown={onBackdropMouseDown}
        >
          <div className="mx-auto w-full max-w-2xl rounded-[32px] border border-white/70 bg-white/95 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
            {formError ? (
              <div className="mb-6 flex items-start justify-between gap-4 rounded-[22px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700 shadow-sm">
                <p>{formError}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setFormError(null)}
                  className="h-8 w-8 shrink-0 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
                  aria-label="Cerrar mensaje"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 border-b border-border/70 pb-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
                  Customers
                </p>
                <div className="space-y-1">
                  <h3 id="edit-customer-title" className="text-2xl font-semibold tracking-tight text-slate-950">
                    Editar Cliente
                  </h3>
                  <p className="max-w-2xl text-justify text-sm leading-6 text-muted-foreground">
                    Actualiza los datos base del customer sin afectar su historial comercial ni sus conversaciones.
                  </p>
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 sm:w-56">
                <Button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={updateCustomerMutation.isPending}
                  className="w-full"
                >
                  {updateCustomerMutation.isPending ? "Guardando..." : "Guardar cambios"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={requestClose}
                  disabled={updateCustomerMutation.isPending}
                  className="w-full"
                >
                  Cancelar
                </Button>
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Nombre Cliente
                </span>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(event) => updateField("displayName", event.target.value)}
                  onBlur={() => touchField("displayName")}
                  disabled={updateCustomerMutation.isPending}
                  placeholder="Nombre del cliente"
                  className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-sm text-muted-foreground">
                  Nombre principal con el que identificas al cliente en el CRM.
                </p>
              </label>

              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Canal principal
                </span>
                <div className="flex h-11 items-center rounded-2xl border border-border bg-slate-50 px-4 text-sm font-medium text-slate-700">
                  {formatChannelLabel(customer.primaryChannel)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Visible para referencia, sin edición en este flujo.
                </p>
              </div>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {isWhatsappCustomer ? "Teléfono WhatsApp" : "Identificador externo"}
                </span>
                {isWhatsappCustomer ? (
                  <div className="flex items-stretch gap-3">
                    <div className="flex h-11 w-24 shrink-0 items-center justify-center rounded-2xl border border-border bg-slate-50 px-4 text-sm font-medium text-slate-700">
                      {COSTA_RICA_PHONE_PREFIX}
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.externalId}
                      onChange={(event) => handlePhoneChange(event.target.value)}
                      onBlur={() => touchField("externalId")}
                      disabled={updateCustomerMutation.isPending}
                      placeholder="8892 8729"
                      maxLength={9}
                      required
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      aria-invalid={touchedFields.externalId && validationErrors.externalId ? true : undefined}
                      className="h-11 min-w-0 flex-1 appearance-none rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 shadow-none outline-none ring-0 transition placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={form.externalId}
                    onChange={(event) => updateField("externalId", event.target.value)}
                    onBlur={() => touchField("externalId")}
                    disabled={updateCustomerMutation.isPending}
                    placeholder="Identificador externo"
                    aria-invalid={touchedFields.externalId && validationErrors.externalId ? true : undefined}
                    required
                    className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                )}
                {touchedFields.externalId && validationErrors.externalId ? (
                  <p className="text-sm font-medium text-rose-700">{validationErrors.externalId}</p>
                ) : isWhatsappCustomer ? (
                  <p className="text-sm text-muted-foreground">
                    WhatsApp principal del cliente en formato Costa Rica (+506).
                  </p>
                ) : null}
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Estado comercial
                </span>
                <input
                  type="text"
                  value={form.customerStatus}
                  onChange={(event) => updateField("customerStatus", event.target.value)}
                  onBlur={() => touchField("customerStatus")}
                  disabled={updateCustomerMutation.isPending}
                  placeholder="Opcional: active, vip, dormant..."
                  className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-sm text-muted-foreground">
                  Define la etapa comercial del cliente (ej: active, vip, retained, dormant, at_risk).
                </p>
              </label>
            </div>
          </div>
        </div>
      ) : null}

      <UnsavedChangesDialog
        isOpen={isDiscardChangesOpen}
        onContinueEditing={() => setIsDiscardChangesOpen(false)}
        onDiscardChanges={() => {
          setIsDiscardChangesOpen(false);
          handleClose();
        }}
        isDisabled={updateCustomerMutation.isPending}
      />
    </>
  );
}

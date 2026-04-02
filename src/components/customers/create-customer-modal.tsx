"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { ChannelType } from "@prisma/client";

import { useCreateCustomer } from "@/hooks/use-create-customer";
import { Button } from "@/components/ui/button";
import { formatChannelLabel } from "@/components/customers/customer-presenters";

type CreateCustomerModalProps = {
  channelOptions: ChannelType[];
  isOpen: boolean;
  onClose: () => void;
  onCreated: (displayName: string) => void;
};

type FormState = {
  primaryChannel: ChannelType | "";
  externalId: string;
  displayName: string;
  customerStatus: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;
type TouchedState = Partial<Record<keyof FormState, boolean>>;

const INITIAL_FORM_STATE: FormState = {
  primaryChannel: "",
  externalId: "",
  displayName: "",
  customerStatus: "Activo",
};

function getExternalIdPlaceholder(channel: ChannelType | "") {
  switch (channel) {
    case "wa":
      return "Ej. +50688...";
    case "ig":
      return "Ej. @usuario";
    case "fb":
      return "Ej. fb-123";
    default:
      return "Ej. +50688..., @usuario, fb-123";
  }
}

function validateForm(form: FormState, channelOptions: ChannelType[]): FormErrors {
  const errors: FormErrors = {};

  if (!form.primaryChannel) {
    errors.primaryChannel = "Selecciona el canal principal del customer.";
  } else if (!channelOptions.includes(form.primaryChannel)) {
    errors.primaryChannel = "Selecciona un canal valido.";
  }

  if (!form.externalId.trim()) {
    errors.externalId = "El identificador externo es obligatorio.";
  }

  if (!form.displayName.trim()) {
    errors.displayName = "El nombre del customer es obligatorio en el CRM.";
  }

  return errors;
}

export function CreateCustomerModal({
  channelOptions,
  isOpen,
  onClose,
  onCreated,
}: CreateCustomerModalProps) {
  const router = useRouter();
  const createCustomerMutation = useCreateCustomer();
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [touchedFields, setTouchedFields] = useState<TouchedState>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setForm(INITIAL_FORM_STATE);
      setFormErrors({});
      setTouchedFields({});
      setFormError(null);
    }
  }, [isOpen]);

  const validationErrors = useMemo(
    () => validateForm(form, channelOptions),
    [channelOptions, form],
  );

  const externalIdPlaceholder = useMemo(
    () => getExternalIdPlaceholder(form.primaryChannel),
    [form.primaryChannel],
  );

  if (!isOpen) {
    return null;
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

  function touchField(key: keyof FormState) {
    setTouchedFields((current) => ({
      ...current,
      [key]: true,
    }));
  }

  function handleClose() {
    if (createCustomerMutation.isPending) {
      return;
    }

    onClose();
  }

  async function handleSubmit() {
    const nextErrors = validateForm(form, channelOptions);
    setTouchedFields({
      primaryChannel: true,
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
      const customer = await createCustomerMutation.mutateAsync({
        primaryChannel: form.primaryChannel as ChannelType,
        externalId: form.externalId.trim(),
        displayName: form.displayName.trim(),
        customerStatus: form.customerStatus.trim() || undefined,
      });

      router.refresh();
      onCreated(customer.displayName?.trim() || form.displayName.trim());
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message);
        return;
      }

      setFormError("No se pudo crear el customer.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/25 px-4 py-10 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-customer-title"
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
              <h3 id="create-customer-title" className="text-2xl font-semibold tracking-tight text-slate-950">
                Nuevo Cliente
              </h3>
              <p className="max-w-2xl text-justify text-sm leading-6 text-muted-foreground">
                Crea un nuevo cliente en la base comercial. El nombre es obligatorio para este
                flujo manual, aunque otros orígenes del sistema puedan crear contactos sin nombre.
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-56">
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={createCustomerMutation.isPending}
              className="w-full"
            >
              {createCustomerMutation.isPending ? "Guardando..." : "Crear Cliente"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createCustomerMutation.isPending}
              className="w-full"
            >
              Cancelar
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Canal principal
            </span>
            <select
              value={form.primaryChannel}
              onChange={(event) => updateField("primaryChannel", event.target.value as ChannelType | "")}
              onBlur={() => touchField("primaryChannel")}
              disabled={createCustomerMutation.isPending}
              aria-invalid={touchedFields.primaryChannel && validationErrors.primaryChannel ? true : undefined}
              required
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Selecciona un canal</option>
              {channelOptions.map((channel) => (
                <option key={channel} value={channel}>
                  {formatChannelLabel(channel)}
                </option>
              ))}
            </select>
            {touchedFields.primaryChannel && validationErrors.primaryChannel ? (
              <p className="text-sm font-medium text-rose-700">{validationErrors.primaryChannel}</p>
            ) : null}
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Identificador externo
            </span>
            <input
              type="text"
              value={form.externalId}
              onChange={(event) => updateField("externalId", event.target.value)}
              onBlur={() => touchField("externalId")}
              disabled={createCustomerMutation.isPending}
              placeholder={externalIdPlaceholder}
              aria-invalid={touchedFields.externalId && validationErrors.externalId ? true : undefined}
              required
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {touchedFields.externalId && validationErrors.externalId ? (
              <p className="text-sm font-medium text-rose-700">{validationErrors.externalId}</p>
            ) : null}
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Nombre Cliente
            </span>
            <input
              type="text"
              value={form.displayName}
              onChange={(event) => updateField("displayName", event.target.value)}
              onBlur={() => touchField("displayName")}
              disabled={createCustomerMutation.isPending}
              placeholder="Nombre del cliente"
              aria-invalid={touchedFields.displayName && validationErrors.displayName ? true : undefined}
              required
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {touchedFields.displayName && validationErrors.displayName ? (
              <p className="text-sm font-medium text-rose-700">{validationErrors.displayName}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Este campo es obligatorio solo para la creación manual desde el CRM.
              </p>
            )}
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Estado comercial
            </span>
            <input
              type="text"
              value={form.customerStatus}
              onChange={(event) => updateField("customerStatus", event.target.value)}
              onBlur={() => touchField("customerStatus")}
              disabled={createCustomerMutation.isPending}
              placeholder="Opcional: active, vip, dormant..."
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

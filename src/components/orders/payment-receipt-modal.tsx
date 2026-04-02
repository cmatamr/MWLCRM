"use client";

import { useEffect, useMemo, useState } from "react";

import { useBanks } from "@/hooks/use-banks";
import { Button } from "@/components/ui/button";
import type {
  CreatePaymentReceiptInput,
  OrderReceiptSummary,
} from "@/server/services/orders/types";

type PaymentReceiptModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  initialReceipt?: OrderReceiptSummary | null;
  isSubmitting: boolean;
  submitError?: string | null;
  onClose: () => void;
  onSubmit: (input: CreatePaymentReceiptInput) => Promise<void>;
};

type FormState = {
  amountCrc: string;
  bankId: string;
  reference: string;
  senderName: string;
  recipientName: string;
  destinationPhone: string;
  receiptDate: string;
  receiptTime: string;
  internalNotes: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const INITIAL_FORM_STATE: FormState = {
  amountCrc: "",
  bankId: "",
  reference: "",
  senderName: "",
  recipientName: "",
  destinationPhone: "",
  receiptDate: "",
  receiptTime: "",
  internalNotes: "",
};

function buildInitialFormState(receipt?: OrderReceiptSummary | null): FormState {
  if (!receipt) {
    return INITIAL_FORM_STATE;
  }

  return {
    amountCrc: receipt.amountCrc != null ? String(receipt.amountCrc) : "",
    bankId: receipt.bankId ?? "",
    reference: receipt.reference ?? "",
    senderName: receipt.senderName ?? "",
    recipientName: receipt.recipientName ?? "",
    destinationPhone: receipt.destinationPhone ?? "",
    receiptDate: receipt.receiptDate ?? "",
    receiptTime: receipt.receiptTime ?? "",
    internalNotes: receipt.internalNotes ?? "",
  };
}

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};
  const parsedAmount = Number.parseInt(form.amountCrc.trim(), 10);

  if (!form.amountCrc.trim()) {
    errors.amountCrc = "El monto es obligatorio.";
  } else if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
    errors.amountCrc = "Ingresa un monto valido mayor que cero.";
  }

  return errors;
}

function normalizeOptionalString(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function PaymentReceiptModal({
  isOpen,
  mode,
  initialReceipt,
  isSubmitting,
  submitError,
  onClose,
  onSubmit,
}: PaymentReceiptModalProps) {
  const { data: banks, isLoading: isLoadingBanks } = useBanks();
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [touchedFields, setTouchedFields] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(buildInitialFormState(initialReceipt));
      setTouchedFields({});
      setLocalError(null);
    } else {
      setForm(INITIAL_FORM_STATE);
      setTouchedFields({});
      setLocalError(null);
    }
  }, [initialReceipt, isOpen]);

  const formErrors = useMemo(() => validateForm(form), [form]);
  const isEditMode = mode === "edit";

  if (!isOpen) {
    return null;
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setLocalError(null);
  }

  function touchField(key: keyof FormState) {
    setTouchedFields((current) => ({ ...current, [key]: true }));
  }

  function handleClose() {
    if (isSubmitting) {
      return;
    }

    onClose();
  }

  async function handleSubmit() {
    const nextErrors = validateForm(form);
    setTouchedFields({
      amountCrc: true,
      bankId: true,
      reference: true,
      senderName: true,
      recipientName: true,
      destinationPhone: true,
      receiptDate: true,
      receiptTime: true,
      internalNotes: true,
    });
    setLocalError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const parsedAmount = Number.parseInt(form.amountCrc.trim(), 10);

    const payload = {
      amountCrc: parsedAmount,
      currency: "CRC",
      bankId: normalizeOptionalString(form.bankId),
      reference: normalizeOptionalString(form.reference),
      senderName: normalizeOptionalString(form.senderName),
      recipientName: normalizeOptionalString(form.recipientName),
      destinationPhone: normalizeOptionalString(form.destinationPhone),
      receiptDate: normalizeOptionalString(form.receiptDate),
      receiptTime: normalizeOptionalString(form.receiptTime),
      internalNotes: normalizeOptionalString(form.internalNotes),
    } satisfies CreatePaymentReceiptInput;

    try {
      await onSubmit(payload);
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        setLocalError(error.message);
        return;
      }

      setLocalError(
        isEditMode ? "No se pudo actualizar el comprobante." : "No se pudo crear el comprobante.",
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/25 px-4 py-10 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-receipt-modal-title"
    >
      <div className="mx-auto w-full max-w-3xl rounded-[32px] border border-white/70 bg-white/95 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
        <div className="flex flex-col gap-3 border-b border-border/70 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
              Payment receipts
            </p>
            <div className="space-y-1">
              <h3 id="payment-receipt-modal-title" className="text-2xl font-semibold tracking-tight text-slate-950">
                {isEditMode ? "Editar comprobante" : "Agregar comprobante"}
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Registra o actualiza un comprobante manual dentro del CRM sin exponer campos
                tecnicos del flujo automatico.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-950">Monto (CRC)</span>
            <input
              type="number"
              min={1}
              step={1}
              value={form.amountCrc}
              onChange={(event) => updateField("amountCrc", event.target.value)}
              onBlur={() => touchField("amountCrc")}
              disabled={isSubmitting}
              className="w-full rounded-[18px] border border-border bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {touchedFields.amountCrc && formErrors.amountCrc ? (
              <p className="text-xs font-medium text-rose-700">{formErrors.amountCrc}</p>
            ) : null}
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-950">Banco</span>
            <select
              value={form.bankId}
              onChange={(event) => updateField("bankId", event.target.value)}
              disabled={isSubmitting || isLoadingBanks}
              className="w-full rounded-[18px] border border-border bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">
                {isLoadingBanks ? "Cargando bancos..." : "Selecciona un banco"}
              </option>
              {banks.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-950">Referencia</span>
            <input
              type="text"
              value={form.reference}
              onChange={(event) => updateField("reference", event.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-[18px] border border-border bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-950">Remitente</span>
            <input
              type="text"
              value={form.senderName}
              onChange={(event) => updateField("senderName", event.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-[18px] border border-border bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-950">Destinatario</span>
            <input
              type="text"
              value={form.recipientName}
              onChange={(event) => updateField("recipientName", event.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-[18px] border border-border bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-950">Telefono</span>
            <input
              type="text"
              value={form.destinationPhone}
              onChange={(event) => updateField("destinationPhone", event.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-[18px] border border-border bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-950">Fecha</span>
            <input
              type="date"
              value={form.receiptDate}
              onChange={(event) => updateField("receiptDate", event.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-[18px] border border-border bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-950">Hora</span>
            <input
              type="time"
              value={form.receiptTime}
              onChange={(event) => updateField("receiptTime", event.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-[18px] border border-border bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>

        <label className="mt-4 block space-y-2">
          <span className="text-sm font-medium text-slate-950">Notas internas</span>
          <textarea
            value={form.internalNotes}
            onChange={(event) => updateField("internalNotes", event.target.value)}
            rows={4}
            disabled={isSubmitting}
            className="w-full rounded-[18px] border border-border bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>

        {localError || submitError ? (
          <div className="mt-4 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {localError ?? submitError}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting}>
            {isSubmitting
              ? isEditMode
                ? "Guardando..."
                : "Creando..."
              : isEditMode
                ? "Guardar cambios"
                : "Agregar comprobante"}
          </Button>
        </div>
      </div>
    </div>
  );
}

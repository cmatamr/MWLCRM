"use client";

import { useEffect, useMemo, useState } from "react";

import { useBanks } from "@/hooks/use-banks";
import { Button } from "@/components/ui/button";
import { useModalDismiss } from "@/components/ui/modal-dismiss";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import type {
  BankListItem,
  CreatePaymentReceiptInput,
  OrderReceiptSummary,
} from "@/server/services/orders/types";
import { paymentReceiptTransferTypeValues } from "@/domain/crm/orders";

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
  receiptDateTime: string;
  transferType: string;
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
  receiptDateTime: "",
  transferType: "",
  internalNotes: "",
};

const fieldControlClassName =
  "box-border w-full rounded-[18px] border border-border bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function getCurrentLocalDateTimeInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function normalizeBankLookupValue(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
}

function resolveInitialBankId(
  receipt: OrderReceiptSummary | null | undefined,
  banks: BankListItem[],
) {
  if (!receipt) {
    return "";
  }

  if (receipt.bankId) {
    return receipt.bankId;
  }

  const normalizedBank = normalizeBankLookupValue(receipt.bank);

  if (!normalizedBank) {
    return "";
  }

  const matchedBank = banks.find((bank) => {
    const normalizedName = normalizeBankLookupValue(bank.name);
    const normalizedCode = normalizeBankLookupValue(bank.code);

    return normalizedBank === normalizedName || normalizedBank === normalizedCode;
  });

  return matchedBank?.id ?? "";
}

function normalizeDateForDateTimeInput(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  const isoDateMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);

  if (isoDateMatch) {
    return isoDateMatch[1] ?? "";
  }

  return "";
}

function normalizeTimeForDateTimeInput(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const normalized = value.trim().toUpperCase();
  const twelveHourMatch = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);

  if (twelveHourMatch) {
    let hours = Number.parseInt(twelveHourMatch[1] ?? "0", 10);
    const minutes = twelveHourMatch[2] ?? "00";
    const meridiem = twelveHourMatch[3];

    if (meridiem === "AM") {
      hours = hours % 12;
    } else {
      hours = (hours % 12) + 12;
    }

    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }

  const twentyFourHourMatch = normalized.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);

  if (twentyFourHourMatch) {
    return `${twentyFourHourMatch[1]}:${twentyFourHourMatch[2]}`;
  }

  return "";
}

function combineReceiptDateTime(
  receiptDate: string | null | undefined,
  receiptTime: string | null | undefined,
) {
  const normalizedDate = normalizeDateForDateTimeInput(receiptDate);

  if (!normalizedDate) {
    return "";
  }

  const normalizedTime = normalizeTimeForDateTimeInput(receiptTime);

  if (!normalizedTime) {
    return `${normalizedDate}T00:00`;
  }

  return `${normalizedDate}T${normalizedTime}`;
}

function splitReceiptDateTimeInput(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return {
      receiptDate: null,
      receiptTime: null,
    };
  }

  const [receiptDate, timeValue] = normalized.split("T");

  if (!receiptDate || !timeValue) {
    return {
      receiptDate: null,
      receiptTime: null,
    };
  }

  const [hoursText, minutesText] = timeValue.split(":");
  const hours = Number.parseInt(hoursText ?? "", 10);
  const minutes = Number.parseInt(minutesText ?? "", 10);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return {
      receiptDate,
      receiptTime: null,
    };
  }

  const meridiem = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 === 0 ? 12 : hours % 12;
  const receiptTime = `${String(normalizedHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${meridiem}`;

  return {
    receiptDate,
    receiptTime,
  };
}

function buildInitialFormState(
  receipt?: OrderReceiptSummary | null,
  banks: BankListItem[] = [],
): FormState {
  if (!receipt) {
    return {
      ...INITIAL_FORM_STATE,
      receiptDateTime: getCurrentLocalDateTimeInputValue(),
    };
  }

  return {
    amountCrc: receipt.amountCrc != null ? String(receipt.amountCrc) : "",
    bankId: resolveInitialBankId(receipt, banks),
    reference: receipt.reference ?? "",
    senderName: receipt.senderName ?? "",
    recipientName: receipt.recipientName ?? "",
    destinationPhone: receipt.destinationPhone ?? "",
    receiptDateTime: combineReceiptDateTime(receipt.receiptDate, receipt.receiptTime),
    transferType: receipt.transferType ?? "",
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
  const [isDiscardChangesOpen, setIsDiscardChangesOpen] = useState(false);
  const isEditMode = mode === "edit";

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

  useEffect(() => {
    if (!isOpen || !isEditMode || !initialReceipt || form.bankId || banks.length === 0) {
      return;
    }

    const resolvedBankId = resolveInitialBankId(initialReceipt, banks);

    if (!resolvedBankId) {
      return;
    }

    setForm((current) => ({
      ...current,
      bankId: resolvedBankId,
    }));
  }, [banks, form.bankId, initialReceipt, isEditMode, isOpen]);

  const formErrors = useMemo(() => validateForm(form), [form]);

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

  const initialForm = useMemo(
    () => buildInitialFormState(initialReceipt, banks),
    [initialReceipt, banks],
  );
  const hasUnsavedChanges =
    form.amountCrc.trim() !== initialForm.amountCrc.trim() ||
    form.bankId !== initialForm.bankId ||
    form.reference.trim() !== initialForm.reference.trim() ||
    form.senderName.trim() !== initialForm.senderName.trim() ||
    form.recipientName.trim() !== initialForm.recipientName.trim() ||
    form.destinationPhone.trim() !== initialForm.destinationPhone.trim() ||
    form.receiptDateTime.trim() !== initialForm.receiptDateTime.trim() ||
    form.transferType !== initialForm.transferType ||
    form.internalNotes.trim() !== initialForm.internalNotes.trim();

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

  if (!isOpen) {
    return null;
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
      receiptDateTime: true,
      transferType: true,
      internalNotes: true,
    });
    setLocalError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const parsedAmount = Number.parseInt(form.amountCrc.trim(), 10);
    const normalizedReceiptDateTime = normalizeOptionalString(form.receiptDateTime);
    const splitReceiptDateTime = normalizedReceiptDateTime
      ? splitReceiptDateTimeInput(normalizedReceiptDateTime)
      : isEditMode && !touchedFields.receiptDateTime
        ? {
            receiptDate: initialReceipt?.receiptDate ?? undefined,
            receiptTime: initialReceipt?.receiptTime ?? undefined,
          }
        : {
            receiptDate: null,
            receiptTime: null,
          };

    const payload = {
      amountCrc: parsedAmount,
      currency: "CRC",
      bankId: normalizeOptionalString(form.bankId),
      reference: normalizeOptionalString(form.reference),
      senderName: normalizeOptionalString(form.senderName),
      recipientName: normalizeOptionalString(form.recipientName),
      destinationPhone: normalizeOptionalString(form.destinationPhone),
      receiptDate: splitReceiptDateTime.receiptDate,
      receiptTime: splitReceiptDateTime.receiptTime,
      transferType: normalizeOptionalString(form.transferType) as CreatePaymentReceiptInput["transferType"],
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
      onMouseDown={onBackdropMouseDown}
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
              className={fieldControlClassName}
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
              className={`${fieldControlClassName} appearance-none`}
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
              className={fieldControlClassName}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-950">Remitente</span>
            <input
              type="text"
              value={form.senderName}
              onChange={(event) => updateField("senderName", event.target.value)}
              disabled={isSubmitting}
              className={fieldControlClassName}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-950">Destinatario</span>
            <input
              type="text"
              value={form.recipientName}
              onChange={(event) => updateField("recipientName", event.target.value)}
              disabled={isSubmitting}
              className={fieldControlClassName}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-950">Telefono</span>
            <input
              type="text"
              value={form.destinationPhone}
              onChange={(event) => updateField("destinationPhone", event.target.value)}
              disabled={isSubmitting}
              className={fieldControlClassName}
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-950">Tipo de transferencia</span>
            <select
              value={form.transferType}
              onChange={(event) => updateField("transferType", event.target.value)}
              disabled={isSubmitting}
              className={`${fieldControlClassName} appearance-none`}
            >
              <option value="">Selecciona un tipo</option>
              {paymentReceiptTransferTypeValues.map((transferType) => (
                <option key={transferType} value={transferType}>
                  {transferType}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-950">Fecha y hora</span>
            <input
              type="datetime-local"
              value={form.receiptDateTime}
              onChange={(event) => updateField("receiptDateTime", event.target.value)}
              onBlur={() => touchField("receiptDateTime")}
              disabled={isSubmitting}
              className={fieldControlClassName}
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
            className={`${fieldControlClassName} leading-6`}
          />
        </label>

        {localError || submitError ? (
          <div className="mt-4 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {localError ?? submitError}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={requestClose} disabled={isSubmitting}>
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

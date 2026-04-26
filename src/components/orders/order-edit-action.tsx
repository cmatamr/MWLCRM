"use client";

import Link from "next/link";
import { OrderStatusEnum } from "@prisma/client";
import { Pencil, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { orderStatusesRequiringValidatedReceipt } from "@/domain/crm/orders";
import { useUpdateOrder } from "@/hooks/use-update-order";
import { Button } from "@/components/ui/button";
import { useModalDismiss } from "@/components/ui/modal-dismiss";
import { StatusBadgeFromViewModel } from "@/components/ui/status-badge";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";

import {
  formatOrderStatusLabel,
  formatOrderShortId,
  formatPaymentStatusLabel,
  getPaymentStatusBadge,
} from "./order-presenters";
import { validateOrderItemDeliveryDateInput } from "./order-item-form-utils";

type EditableOrder = {
  id: string;
  status: OrderStatusEnum;
  paymentStatus: string;
  deliveryDate: string | null;
};

type OrderEditActionProps = {
  order: EditableOrder;
};

function normalizeDateValueForInput(value: string | null): string {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.length >= 10 ? trimmed.slice(0, 10) : trimmed;
}

export function OrderEditAction({ order }: OrderEditActionProps) {
  const updateOrderMutation = useUpdateOrder();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<OrderStatusEnum>(order.status);
  const [deliveryDate, setDeliveryDate] = useState(normalizeDateValueForInput(order.deliveryDate));
  const [deliveryDateTouched, setDeliveryDateTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isDiscardChangesOpen, setIsDiscardChangesOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStatus(order.status);
      setDeliveryDate(normalizeDateValueForInput(order.deliveryDate));
      setDeliveryDateTouched(false);
      setFormError(null);
    }
  }, [isOpen, order.deliveryDate, order.status]);

  const statusOptions = useMemo(() => Object.values(OrderStatusEnum), []);
  const restrictedStatuses = useMemo(
    () => new Set<OrderStatusEnum>(orderStatusesRequiringValidatedReceipt),
    [],
  );
  const deliveryDateValidationError = useMemo(
    () => validateOrderItemDeliveryDateInput(deliveryDate),
    [deliveryDate],
  );
  const hasValidatedReceipt = order.paymentStatus.trim().toLowerCase() === "validated";

  const normalizedInitialDate = normalizeDateValueForInput(order.deliveryDate);
  const normalizedCurrentDate = deliveryDate.trim();
  const hasChanges = status !== order.status || normalizedCurrentDate !== normalizedInitialDate;
  const statusValidationError = getStatusValidationError(status);
  const canSave =
    hasChanges &&
    !updateOrderMutation.isPending &&
    !deliveryDateValidationError &&
    !statusValidationError;

  function getStatusValidationError(nextStatus: OrderStatusEnum) {
    if (!hasValidatedReceipt && restrictedStatuses.has(nextStatus)) {
      return `No se puede cambiar el estado a ${formatOrderStatusLabel(nextStatus)} sin un comprobante de pago válido.`;
    }

    return null;
  }

  function handleClose() {
    if (updateOrderMutation.isPending) {
      return;
    }

    setIsOpen(false);
  }

  function requestClose() {
    if (updateOrderMutation.isPending) {
      return;
    }

    if (hasChanges) {
      setIsDiscardChangesOpen(true);
      return;
    }

    handleClose();
  }

  const { onBackdropMouseDown } = useModalDismiss({
    isOpen,
    onClose: requestClose,
    isDisabled: updateOrderMutation.isPending,
  });

  async function handleSubmit() {
    setFormError(null);
    setDeliveryDateTouched(true);

    if (statusValidationError) {
      return;
    }

    if (deliveryDateValidationError) {
      return;
    }

    if (!hasChanges) {
      setIsOpen(false);
      return;
    }

    try {
      await updateOrderMutation.mutateAsync({
        orderId: order.id,
        input: {
          status,
          deliveryDate: normalizedCurrentDate || null,
        },
      });
      setIsOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message);
        return;
      }

      setFormError("No se pudo actualizar la orden.");
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="h-9 w-9 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        aria-label={`Editar orden ${order.id}`}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/25 px-4 py-10 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`edit-order-title-${order.id}`}
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
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">Órdenes</p>
                <div className="space-y-1">
                  <h3 id={`edit-order-title-${order.id}`} className="text-2xl font-semibold tracking-tight text-slate-950">
                    Editar orden
                  </h3>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                    Resumen de orden
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatOrderShortId(order.id)}
                  </p>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    Edita estado operativo y fecha de entrega sin alterar la validación de pagos por comprobante.
                  </p>
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 sm:w-56">
                <Button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={!canSave}
                  className="w-full"
                >
                  {updateOrderMutation.isPending ? "Guardando..." : "Guardar cambios"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={requestClose}
                  disabled={updateOrderMutation.isPending}
                  className="w-full"
                >
                  Cancelar
                </Button>
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Estado
                </span>
                <select
                  value={status}
                  onChange={(event) => {
                    const nextStatus = event.target.value as OrderStatusEnum;
                    setStatus(nextStatus);
                    setFormError(null);
                  }}
                  disabled={updateOrderMutation.isPending}
                  className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary"
                >
                  {statusOptions.map((statusOption) => (
                    <option key={statusOption} value={statusOption}>
                      {formatOrderStatusLabel(statusOption)}
                    </option>
                  ))}
                </select>
                {statusValidationError ? (
                  <p className="text-sm font-medium text-rose-700">{statusValidationError}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Estado operativo real de la orden.</p>
                )}
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Fecha de entrega
                </span>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(event) => {
                    setDeliveryDate(event.target.value);
                    setFormError(null);
                  }}
                  onBlur={() => setDeliveryDateTouched(true)}
                  disabled={updateOrderMutation.isPending}
                  aria-invalid={deliveryDateTouched && deliveryDateValidationError ? true : undefined}
                  className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                {deliveryDateTouched && deliveryDateValidationError ? (
                  <p className="text-sm font-medium text-rose-700">{deliveryDateValidationError}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Formato esperado: YYYY-MM-DD.</p>
                )}
              </label>
            </div>

            <div className="mt-5 rounded-[22px] border border-border/70 bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Estado de pago
              </p>
              <div className="mt-2 flex items-center justify-center">
                <StatusBadgeFromViewModel badge={getPaymentStatusBadge(order.paymentStatus)} />
              </div>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                {formatPaymentStatusLabel(order.paymentStatus)}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                La validación de pago se controla por comprobantes, no desde esta edición de orden.
              </p>
              <Button asChild type="button" variant="outline" size="sm" className="mt-3">
                <Link href={`/orders/${order.id}`}>Ver comprobantes en detalle</Link>
              </Button>
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
        isDisabled={updateOrderMutation.isPending}
      />
    </>
  );
}

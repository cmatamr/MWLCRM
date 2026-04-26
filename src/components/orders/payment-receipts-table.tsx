"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { createPortal } from "react-dom";

import { formatCalendarDate, formatCurrencyCRC, formatDateTime } from "@/lib/formatters";
import type { CreatePaymentReceiptInput, OrderReceiptSummary } from "@/server/services/orders/types";
import { useCancelPaymentReceipt } from "@/hooks/use-cancel-payment-receipt";
import { useCreatePaymentReceipt } from "@/hooks/use-create-payment-receipt";
import { useDeletePaymentReceipt } from "@/hooks/use-delete-payment-receipt";
import { useRejectPaymentReceipt } from "@/hooks/use-reject-payment-receipt";
import { useUpdatePaymentReceipt } from "@/hooks/use-update-payment-receipt";
import { useValidatePaymentReceipt } from "@/hooks/use-validate-payment-receipt";
import { Button } from "@/components/ui/button";
import { useModalDismiss } from "@/components/ui/modal-dismiss";
import { TableEmptyStateRow } from "@/components/ui/state-display";
import { StatusBadgeFromViewModel } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import { PaymentReceiptModal } from "./payment-receipt-modal";
import { getPaymentStatusBadge } from "./order-presenters";

type PaymentReceiptsTableProps = {
  orderId: string;
  receipts: OrderReceiptSummary[];
};

function getNormalizedReceiptStatus(receipt: OrderReceiptSummary) {
  return receipt.status.trim().toLowerCase();
}

function canEditReceipt(receipt: OrderReceiptSummary) {
  return getNormalizedReceiptStatus(receipt) === "pending_validation";
}

function canValidateReceipt(receipt: OrderReceiptSummary) {
  return canEditReceipt(receipt) && receipt.amountCrc != null;
}

function canRejectReceipt(receipt: OrderReceiptSummary) {
  return getNormalizedReceiptStatus(receipt) === "pending_validation";
}

function canCancelReceipt(receipt: OrderReceiptSummary) {
  return getNormalizedReceiptStatus(receipt) === "pending_validation";
}

function canSoftDeleteReceipt(receipt: OrderReceiptSummary) {
  return getNormalizedReceiptStatus(receipt) === "pending_validation";
}

export function PaymentReceiptsTable({ orderId, receipts }: PaymentReceiptsTableProps) {
  const createReceiptMutation = useCreatePaymentReceipt(orderId);
  const updateReceiptMutation = useUpdatePaymentReceipt(orderId);
  const deleteReceiptMutation = useDeletePaymentReceipt(orderId);
  const validateReceiptMutation = useValidatePaymentReceipt(orderId);
  const rejectReceiptMutation = useRejectPaymentReceipt(orderId);
  const cancelReceiptMutation = useCancelPaymentReceipt(orderId);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<OrderReceiptSummary | null>(null);
  const [receiptPendingValidationConfirm, setReceiptPendingValidationConfirm] =
    useState<OrderReceiptSummary | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [openMenuReceiptId, setOpenMenuReceiptId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    placement: "top" | "bottom";
  } | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const activeTriggerRef = useRef<HTMLButtonElement | null>(null);

  const isAnyMutationPending = useMemo(
    () =>
      createReceiptMutation.isPending ||
      updateReceiptMutation.isPending ||
      deleteReceiptMutation.isPending ||
      validateReceiptMutation.isPending ||
      rejectReceiptMutation.isPending ||
      cancelReceiptMutation.isPending,
    [
      cancelReceiptMutation.isPending,
      createReceiptMutation.isPending,
      deleteReceiptMutation.isPending,
      rejectReceiptMutation.isPending,
      updateReceiptMutation.isPending,
      validateReceiptMutation.isPending,
    ],
  );

  function closeCreateModal() {
    if (createReceiptMutation.isPending) {
      return;
    }

    setIsCreateModalOpen(false);
  }

  function closeEditModal() {
    if (updateReceiptMutation.isPending) {
      return;
    }

    setEditingReceipt(null);
  }

  async function handleCreateReceipt(input: CreatePaymentReceiptInput) {
    setActionError(null);
    await createReceiptMutation.mutateAsync(input);
  }

  async function handleUpdateReceipt(input: CreatePaymentReceiptInput) {
    if (!editingReceipt) {
      return;
    }

    setActionError(null);

    await updateReceiptMutation.mutateAsync({
      receiptId: editingReceipt.id,
      receipt: input,
    });
  }

  function handleValidateReceipt(receipt: OrderReceiptSummary) {
    if (!canValidateReceipt(receipt) || validateReceiptMutation.isPending) {
      return;
    }

    setActionError(null);
    setReceiptPendingValidationConfirm(receipt);
  }

  function closeValidateConfirmModal() {
    if (validateReceiptMutation.isPending) {
      return;
    }

    setReceiptPendingValidationConfirm(null);
  }

  const { onBackdropMouseDown: onValidateConfirmBackdropMouseDown } = useModalDismiss({
    isOpen: receiptPendingValidationConfirm != null,
    onClose: closeValidateConfirmModal,
    isDisabled: validateReceiptMutation.isPending,
  });

  async function confirmValidateReceipt() {
    if (!receiptPendingValidationConfirm || validateReceiptMutation.isPending) {
      return;
    }

    const receipt = receiptPendingValidationConfirm;

    try {
      await validateReceiptMutation.mutateAsync({
        receiptId: receipt.id,
        performedBy: "CRM",
      });
      setReceiptPendingValidationConfirm(null);
    } catch (error) {
      if (error instanceof Error) {
        setActionError(error.message);
        return;
      }

      setActionError("No se pudo validar el comprobante.");
    }
  }

  async function handleRejectReceipt(receipt: OrderReceiptSummary) {
    if (!canRejectReceipt(receipt) || rejectReceiptMutation.isPending) {
      return;
    }

    setActionError(null);
    const confirmed = window.confirm("¿Marcar este comprobante como rechazado?");

    if (!confirmed) {
      return;
    }

    try {
      await rejectReceiptMutation.mutateAsync({
        receiptId: receipt.id,
        input: {
          performedBy: "CRM",
          internalNotes: receipt.internalNotes,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        setActionError(error.message);
        return;
      }

      setActionError("No se pudo rechazar el comprobante.");
    }
  }

  async function handleCancelReceipt(receipt: OrderReceiptSummary) {
    if (!canCancelReceipt(receipt) || cancelReceiptMutation.isPending) {
      return;
    }

    setActionError(null);
    const confirmed = window.confirm("¿Cancelar este comprobante?");

    if (!confirmed) {
      return;
    }

    try {
      await cancelReceiptMutation.mutateAsync({
        receiptId: receipt.id,
        input: {
          performedBy: "CRM",
          internalNotes: receipt.internalNotes,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        setActionError(error.message);
        return;
      }

      setActionError("No se pudo cancelar el comprobante.");
    }
  }

  async function handleSoftDeleteReceipt(receipt: OrderReceiptSummary) {
    if (!canSoftDeleteReceipt(receipt) || deleteReceiptMutation.isPending) {
      return;
    }

    setActionError(null);
    const confirmed = window.confirm("¿Eliminar este comprobante del flujo operativo? Se conservara como soft delete.");

    if (!confirmed) {
      return;
    }

    try {
      await deleteReceiptMutation.mutateAsync({
        receiptId: receipt.id,
        input: {
          performedBy: "CRM",
          internalNotes: receipt.internalNotes,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        setActionError(error.message);
        return;
      }

      setActionError("No se pudo eliminar el comprobante.");
    }
  }

  const mutationError =
    actionError ??
    createReceiptMutation.error?.message ??
    updateReceiptMutation.error?.message ??
    deleteReceiptMutation.error?.message ??
    validateReceiptMutation.error?.message ??
    rejectReceiptMutation.error?.message ??
    cancelReceiptMutation.error?.message ??
    null;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!openMenuReceiptId) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (!menuRef.current?.contains(target)) {
        setOpenMenuReceiptId(null);
        setMenuPosition(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenuReceiptId(null);
        setMenuPosition(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openMenuReceiptId]);

  const calculateMenuPosition = useCallback(
    (element: HTMLButtonElement, receiptId: string) => {
      const receipt = receipts.find((item) => item.id === receiptId);
      const normalizedStatus = receipt ? getNormalizedReceiptStatus(receipt) : "";
      const menuWidth = 220;
      const estimatedMenuHeight = normalizedStatus === "pending_validation" ? 220 : 56;
      const viewportPadding = 16;
      const gap = 8;
      const rect = element.getBoundingClientRect();
      const left = Math.min(
        Math.max(viewportPadding, rect.right - menuWidth),
        window.innerWidth - menuWidth - viewportPadding,
      );
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const spaceAbove = rect.top - viewportPadding;
      const openUpward = spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow;

      return {
        left,
        top: openUpward
          ? Math.max(viewportPadding, rect.top - estimatedMenuHeight - gap)
          : Math.min(window.innerHeight - estimatedMenuHeight - viewportPadding, rect.bottom + gap),
        placement: openUpward ? "top" : "bottom",
      } as const;
    },
    [receipts],
  );

  useEffect(() => {
    if (!openMenuReceiptId || !activeTriggerRef.current) {
      return undefined;
    }

    function updateMenuPosition() {
      if (!activeTriggerRef.current || !openMenuReceiptId) {
        return;
      }

      setMenuPosition(calculateMenuPosition(activeTriggerRef.current, openMenuReceiptId));
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [calculateMenuPosition, openMenuReceiptId]);

  function toggleReceiptMenu(receiptId: string, element: HTMLButtonElement) {
    if (openMenuReceiptId === receiptId) {
      setOpenMenuReceiptId(null);
      setMenuPosition(null);
      activeTriggerRef.current = null;
      return;
    }

    activeTriggerRef.current = element;
    setMenuPosition(calculateMenuPosition(element, receiptId));
    setOpenMenuReceiptId(receiptId);
  }

  function closeMenu() {
    setOpenMenuReceiptId(null);
    setMenuPosition(null);
    activeTriggerRef.current = null;
  }

  function renderMenuActionButton(input: {
    label: string;
    onClick: () => void;
    destructive?: boolean;
    separated?: boolean;
  }) {
    return (
      <button
        type="button"
        role="menuitem"
        className={cn(
          "flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors",
          input.destructive
            ? "text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            : "text-slate-700 hover:bg-slate-100 hover:text-slate-950",
          input.separated ? "mt-1 border-t border-border/70 pt-3" : "",
        )}
        onClick={input.onClick}
      >
        {input.label}
      </button>
    );
  }

  const menuPortal =
    isMounted && openMenuReceiptId && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            className={cn(
              "fixed z-[100] min-w-[220px] overflow-hidden rounded-2xl border border-border/80 bg-white p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.14)]",
              menuPosition.placement === "top" ? "origin-bottom-right" : "origin-top-right",
            )}
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
            }}
          >
            {(() => {
              const receipt = receipts.find((item) => item.id === openMenuReceiptId);

              if (!receipt) {
                return (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    No se encontraron acciones disponibles.
                  </p>
                );
              }

              const normalizedStatus = getNormalizedReceiptStatus(receipt);

              if (normalizedStatus === "pending_validation") {
                return (
                  <>
                    {renderMenuActionButton({
                      label: "Editar",
                      onClick: () => {
                        closeMenu();
                        setEditingReceipt(receipt);
                      },
                    })}
                    {renderMenuActionButton({
                      label: "Rechazar",
                      onClick: () => {
                        closeMenu();
                        void handleRejectReceipt(receipt);
                      },
                    })}
                    {renderMenuActionButton({
                      label: "Cancelar",
                      onClick: () => {
                        closeMenu();
                        void handleCancelReceipt(receipt);
                      },
                    })}
                    {renderMenuActionButton({
                      label: "Eliminar",
                      destructive: true,
                      separated: true,
                      onClick: () => {
                        closeMenu();
                        void handleSoftDeleteReceipt(receipt);
                      },
                    })}
                  </>
                );
              }

              return (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  No hay acciones disponibles para este estado.
                </p>
              );
            })()}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <section className="dashboard-card-3d overflow-hidden p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
              Payment receipts
            </p>
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                Comprobantes de pago
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Gestion operativa de comprobantes con validacion por registro.
              </p>
            </div>
          </div>

          <Button type="button" onClick={() => setIsCreateModalOpen(true)} disabled={isAnyMutationPending}>
            Agregar comprobante
          </Button>
        </div>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-border/70 bg-white/95">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1220px] table-fixed divide-y divide-border/70 text-left">
              <caption className="sr-only">
                Comprobantes de pago asociados a la orden y sus acciones disponibles.
              </caption>
              <colgroup>
                <col className="w-[14%]" />
                <col className="w-[12%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[13%]" />
                <col className="w-[15%]" />
                <col className="w-[10%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead className="bg-muted/40 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-4 text-center font-medium">Estado</th>
                  <th scope="col" className="px-5 py-4 text-center font-medium">Monto</th>
                  <th scope="col" className="px-5 py-4 text-center font-medium">Banco</th>
                  <th scope="col" className="px-4 py-4 text-center font-medium">Tipo Comprobante</th>
                  <th scope="col" className="px-6 py-4 font-medium">Referencia</th>
                  <th scope="col" className="px-4 py-4 font-medium">Remitente</th>
                  <th scope="col" className="px-4 py-4 text-center font-medium">Fecha</th>
                  <th scope="col" className="px-6 py-4 text-center font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-white">
                {receipts.length > 0 ? (
                  receipts.map((receipt) => {
                    const receiptStatusBadge = getPaymentStatusBadge(receipt.status);
                    const normalizedStatus = getNormalizedReceiptStatus(receipt);

                    return (
                      <tr key={receipt.id} className="align-middle text-sm text-slate-700">
                        <td className="px-5 py-5 text-center">
                          <div className="flex justify-center">
                            <StatusBadgeFromViewModel badge={receiptStatusBadge} />
                          </div>
                        </td>
                        <td className="px-5 py-5 text-center">
                          <div className="space-y-1">
                            <p className="font-medium text-slate-950">
                              {receipt.amountCrc != null
                                ? formatCurrencyCRC(receipt.amountCrc)
                                : "Monto no disponible"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {receipt.currency ?? "CRC"}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-5 text-center">
                          <div className="space-y-1">
                            <p className="font-medium text-slate-950">{receipt.bank ?? "Banco no detectado"}</p>
                            <p className="text-xs leading-5 text-muted-foreground">
                              {receipt.internalNotes ?? "Sin notas internas"}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <p className="font-medium text-slate-950">{receipt.transferType ?? "Sin tipo"}</p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="leading-6 text-slate-950">{receipt.reference ?? "Sin referencia"}</p>
                        </td>
                        <td className="px-4 py-5">
                          <div className="space-y-1">
                            <p className="leading-6 text-slate-950">{receipt.senderName ?? "Remitente no detectado"}</p>
                            <p className="text-xs leading-5 text-muted-foreground">
                              {receipt.destinationPhone ?? receipt.recipientName ?? "Sin destino detectado"}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <div className="space-y-1">
                            <p className="font-medium text-slate-950">{receipt.receiptDate ? formatCalendarDate(receipt.receiptDate) : "Sin fecha"}</p>
                            <p className="text-xs leading-5 text-muted-foreground">
                              {receipt.receiptTime ? `Hora: ${receipt.receiptTime}` : `Registrado: ${formatDateTime(receipt.createdAt)}`}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex items-center justify-center gap-2.5 whitespace-nowrap">
                            {normalizedStatus === "pending_validation" ? (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => void handleValidateReceipt(receipt)}
                                disabled={!canValidateReceipt(receipt) || isAnyMutationPending}
                              >
                                {validateReceiptMutation.isPending &&
                                validateReceiptMutation.variables?.receiptId === receipt.id
                                  ? "Validando..."
                                  : "Validar"}
                              </Button>
                            ) : null}

                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-9 w-9 rounded-full"
                              aria-haspopup="menu"
                              aria-expanded={openMenuReceiptId === receipt.id}
                              aria-label="Abrir acciones del comprobante"
                              disabled={isAnyMutationPending}
                              onClick={(event) => toggleReceiptMenu(receipt.id, event.currentTarget)}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <TableEmptyStateRow
                    colSpan={8}
                    title="No hay comprobantes asociados"
                    description="Cuando se registren transferencias o recibos de pago, esta tabla mostrará su validación y acciones."
                  />
                )}
              </tbody>
            </table>
          </div>
        </div>

        {mutationError ? (
          <p className="mt-4 text-sm font-medium text-rose-700">{mutationError}</p>
        ) : null}
      </section>

      <PaymentReceiptModal
        isOpen={isCreateModalOpen}
        mode="create"
        isSubmitting={createReceiptMutation.isPending}
        submitError={createReceiptMutation.error?.message ?? null}
        onClose={closeCreateModal}
        onSubmit={handleCreateReceipt}
      />

      <PaymentReceiptModal
        isOpen={editingReceipt != null}
        mode="edit"
        initialReceipt={editingReceipt}
        isSubmitting={updateReceiptMutation.isPending}
        submitError={updateReceiptMutation.error?.message ?? null}
        onClose={closeEditModal}
        onSubmit={handleUpdateReceipt}
      />

      {receiptPendingValidationConfirm ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/25 px-4 py-10 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="validate-receipt-confirm-title"
          onMouseDown={onValidateConfirmBackdropMouseDown}
        >
          <div className="mx-auto w-full max-w-xl rounded-[32px] border border-white/70 bg-white/95 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
            <div className="space-y-2 border-b border-border/70 pb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
                Payment receipts
              </p>
              <h3 id="validate-receipt-confirm-title" className="text-2xl font-semibold tracking-tight text-slate-950">
                Confirmar validación
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">
                ¿Desea validar este comprobante y mover la orden a producción?
              </p>
            </div>

            <div className="mt-5 space-y-4 rounded-[20px] border border-border/70 bg-slate-50/70 px-4 py-4 text-sm text-slate-700">
              <p>
                Comprobante{" "}
                <span className="font-semibold text-slate-950">
                  #{receiptPendingValidationConfirm.id.slice(0, 8)}
                </span>
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Monto
                  </p>
                  <p className="mt-1 font-medium text-slate-950">
                    {receiptPendingValidationConfirm.amountCrc != null
                      ? formatCurrencyCRC(receiptPendingValidationConfirm.amountCrc)
                      : "Sin monto detectado"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Banco / Tipo
                  </p>
                  <p className="mt-1 font-medium text-slate-950">
                    {receiptPendingValidationConfirm.bank ?? "Banco no detectado"} ·{" "}
                    {receiptPendingValidationConfirm.transferType ?? "Tipo no detectado"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Referencia
                  </p>
                  <p className="mt-1 font-medium text-slate-950">
                    {receiptPendingValidationConfirm.reference ?? "Sin referencia"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Fecha / Hora
                  </p>
                  <p className="mt-1 font-medium text-slate-950">
                    {receiptPendingValidationConfirm.receiptDate
                      ? formatCalendarDate(receiptPendingValidationConfirm.receiptDate)
                      : "Sin fecha"}
                    {receiptPendingValidationConfirm.receiptTime
                      ? ` · ${receiptPendingValidationConfirm.receiptTime}`
                      : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Remitente
                  </p>
                  <p className="mt-1 font-medium text-slate-950">
                    {receiptPendingValidationConfirm.senderName ?? "No detectado"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Destino
                  </p>
                  <p className="mt-1 font-medium text-slate-950">
                    {receiptPendingValidationConfirm.destinationPhone ??
                      receiptPendingValidationConfirm.recipientName ??
                      "No detectado"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={closeValidateConfirmModal}
                disabled={validateReceiptMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => void confirmValidateReceipt()}
                disabled={validateReceiptMutation.isPending}
              >
                {validateReceiptMutation.isPending ? "Validando..." : "Validar comprobante"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {menuPortal}
    </>
  );
}

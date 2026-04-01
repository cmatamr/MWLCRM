"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TableEmptyStateRow } from "@/components/ui/state-display";
import { useCreateOrderItem } from "@/hooks/use-create-order-item";
import { useUpdateOrderItemDeliveryDate } from "@/hooks/use-update-order-item-event-date";
import { useUpdateOrderItemQuantity } from "@/hooks/use-update-order-item-quantity";
import { useDeleteOrderItem } from "@/hooks/use-delete-order-item";
import { formatCalendarDate, formatCurrencyCRC } from "@/lib/formatters";
import type { OrderItemSummary } from "@/server/services/orders/types";

import { validateOrderItemDeliveryDateInput, validateOrderItemQuantityInput } from "./order-item-form-utils";
import { OrderItemPicker } from "./order-item-picker";

type OrderItemsTableProps = {
  orderId: string;
  items: OrderItemSummary[];
};

type OrderItemRowProps = {
  item: OrderItemSummary;
  orderId: string;
  itemCount: number;
};

type AddOrderItemModalProps = {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
};

function AddOrderItemModal({ isOpen, onClose, orderId }: AddOrderItemModalProps) {
  const createMutation = useCreateOrderItem(orderId);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setFormError(null);
    }
  }, [isOpen]);

  function handleClose() {
    if (createMutation.isPending) {
      return;
    }

    onClose();
  }

  async function handleSubmit(input: { product: { id: string }; quantity: number }) {
    setFormError(null);

    try {
      await createMutation.mutateAsync({
        productId: input.product.id,
        quantity: input.quantity,
      });
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message);
        return;
      }

      setFormError("No se pudo agregar el item.");
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
      aria-labelledby="add-order-item-title"
    >
      <div className="w-full max-w-2xl rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
              Order items
            </p>
            <div className="space-y-1">
              <h3 id="add-order-item-title" className="text-2xl font-semibold tracking-tight text-slate-950">
                Agregar item
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Selecciona un producto real del catalogo para crear un nuevo item en esta orden.
              </p>
            </div>
          </div>

          <Button type="button" variant="outline" onClick={handleClose} disabled={createMutation.isPending}>
            Cancelar
          </Button>
        </div>

        <div className="mt-6">
          <OrderItemPicker
            isOpen={isOpen}
            orderId={orderId}
            title="Resumen del nuevo item"
            description="Elige un producto para ver el detalle que se guardara en `order_items`."
            submitLabel="Agregar item"
            isSubmitting={createMutation.isPending}
            formError={formError}
            onAddItem={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}

function OrderItemRow({ item, orderId, itemCount }: OrderItemRowProps) {
  const quantityMutation = useUpdateOrderItemQuantity(orderId);
  const deliveryDateMutation = useUpdateOrderItemDeliveryDate(orderId);
  const deleteMutation = useDeleteOrderItem(orderId);
  const [draftQuantity, setDraftQuantity] = useState(String(item.quantity));
  const [quantityTouched, setQuantityTouched] = useState(false);
  const [draftDeliveryDate, setDraftDeliveryDate] = useState(item.deliveryDate ?? "");
  const [deliveryDateTouched, setDeliveryDateTouched] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    setDraftQuantity(String(item.quantity));
    setQuantityTouched(false);
  }, [item.quantity]);

  useEffect(() => {
    setDraftDeliveryDate(item.deliveryDate ?? "");
    setDeliveryDateTouched(false);
  }, [item.deliveryDate]);

  const validationError = useMemo(() => validateOrderItemQuantityInput(draftQuantity), [draftQuantity]);
  const deliveryDateValidationError = useMemo(
    () => validateOrderItemDeliveryDateInput(draftDeliveryDate),
    [draftDeliveryDate],
  );
  const isDirty = draftQuantity.trim() !== String(item.quantity);
  const isDateDirty = draftDeliveryDate.trim() !== (item.deliveryDate ?? "");
  const isSaving = quantityMutation.isPending;
  const isDateSaving = deliveryDateMutation.isPending;
  const isDeleting = deleteMutation.isPending;
  const isLastItem = itemCount <= 1;

  async function handleSave() {
    const error = validateOrderItemQuantityInput(draftQuantity);

    setQuantityTouched(true);

    if (error || !isDirty || isSaving) {
      return;
    }

    await quantityMutation.mutateAsync({
      itemId: item.id,
      quantity: Number.parseInt(draftQuantity, 10),
    });
  }

  async function handleBlur() {
    setQuantityTouched(true);

    if (!isDirty || validationError || isSaving) {
      return;
    }

    await handleSave();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleSave();
      return;
    }

    if (event.key === "Escape") {
      setDraftQuantity(String(item.quantity));
      setQuantityTouched(false);
    }
  }

  async function handleDeliveryDateSave() {
    const error = validateOrderItemDeliveryDateInput(draftDeliveryDate);

    setDeliveryDateTouched(true);

    if (error || !isDateDirty || isDateSaving) {
      return;
    }

    await deliveryDateMutation.mutateAsync({
      itemId: item.id,
      deliveryDate: draftDeliveryDate.trim() || null,
    });
  }

  async function handleDelete() {
    setDeleteError(null);

    if (isDeleting || isLastItem) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        itemId: item.id,
      });
      setIsDeleteDialogOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        setDeleteError(error.message);
        return;
      }

      setDeleteError("No se pudo eliminar el item.");
    }
  }

  function openDeleteDialog() {
    if (isDeleting || isLastItem) {
      return;
    }

    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  }

  function closeDeleteDialog() {
    if (isDeleting) {
      return;
    }

    setIsDeleteDialogOpen(false);
  }

  async function handleDeliveryDateBlur() {
    setDeliveryDateTouched(true);

    if (!isDateDirty || deliveryDateValidationError || isDateSaving) {
      return;
    }

    await handleDeliveryDateSave();
  }

  function handleDeliveryDateKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleDeliveryDateSave();
      return;
    }

    if (event.key === "Escape") {
      setDraftDeliveryDate(item.deliveryDate ?? "");
      setDeliveryDateTouched(false);
    }
  }

  const showValidationError = quantityTouched && validationError;
  const showDeliveryDateValidationError = deliveryDateTouched && deliveryDateValidationError;

  return (
    <>
      <tr className="text-sm text-slate-700">
        <td className="px-4 py-4 align-middle">
          <div className="space-y-1">
            <p className="font-medium text-slate-950">
              {item.productName?.trim() || "Producto sin snapshot"}
            </p>
            {item.notes ? (
              <p className="max-w-sm text-xs leading-5 text-muted-foreground">
                {item.notes}
              </p>
            ) : null}
          </div>
        </td>
        <td className="px-4 py-4 align-middle text-slate-600">{item.sku ?? "Sin SKU"}</td>
        <td className="px-4 py-4 align-middle">
          <div className="flex w-full flex-col items-center gap-2">
            <div className="flex w-full items-center justify-center">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={draftQuantity}
                onChange={(event) => setDraftQuantity(event.target.value)}
                onBlur={() => void handleBlur()}
                onKeyDown={handleKeyDown}
                disabled={isSaving}
                aria-label={`Cantidad para ${item.productName ?? item.id}`}
                aria-invalid={showValidationError ? true : undefined}
                className="h-10 w-20 rounded-full border border-border bg-white px-3 text-center font-medium text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted"
              />
            </div>
            {isSaving ? (
              <p className="max-w-[11rem] text-center text-xs font-medium text-muted-foreground">
                Guardando...
              </p>
            ) : null}
            {showValidationError ? (
              <p className="max-w-[11rem] text-center text-xs font-medium text-rose-700">
                {validationError}
              </p>
            ) : null}
            {quantityMutation.isError ? (
              <p className="max-w-[12rem] text-center text-xs font-medium text-rose-700">
                {quantityMutation.error.message}
              </p>
            ) : null}
          </div>
        </td>
        <td className="px-4 py-4 align-middle text-right tabular-nums">
          {item.unitPriceCrc != null ? formatCurrencyCRC(item.unitPriceCrc) : "Pendiente"}
        </td>
        <td className="px-4 py-4 align-middle text-right font-medium tabular-nums text-slate-950">
          {item.totalPriceCrc != null ? formatCurrencyCRC(item.totalPriceCrc) : "Pendiente"}
        </td>
        <td className="px-4 py-4 align-middle">{item.theme ?? "Sin tema"}</td>
        <td className="px-4 py-4 align-middle text-muted-foreground">
          <div className="flex w-full flex-col items-end gap-2 overflow-hidden">
            <input
              type="date"
              value={draftDeliveryDate}
              onChange={(event) => setDraftDeliveryDate(event.target.value)}
              onBlur={() => void handleDeliveryDateBlur()}
              onKeyDown={handleDeliveryDateKeyDown}
              disabled={isDateSaving}
              aria-label={`Fecha de entrega para ${item.productName ?? item.id}`}
              aria-invalid={showDeliveryDateValidationError ? true : undefined}
              lang="en-GB"
              style={{
                width: "140px",
                minWidth: "140px",
                maxWidth: "140px",
                textAlign: "center",
              }}
              className="h-[40px] w-[160px] min-w-0 max-w-full appearance-none rounded-full border border-border bg-white px-3 text-center text-[12px] text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted [&::-webkit-calendar-picker-indicator]:ml-1 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-datetime-edit]:flex [&::-webkit-datetime-edit]:w-full [&::-webkit-datetime-edit]:items-center [&::-webkit-datetime-edit]:justify-center [&::-webkit-datetime-edit]:p-0 [&::-webkit-datetime-edit]:text-center [&::-webkit-datetime-edit-fields-wrapper]:flex [&::-webkit-datetime-edit-fields-wrapper]:w-full [&::-webkit-datetime-edit-fields-wrapper]:items-center [&::-webkit-datetime-edit-fields-wrapper]:justify-center"
            />
            {isDateSaving ? (
              <p className="text-center text-xs font-medium text-muted-foreground">Guardando...</p>
            ) : null}
            {showDeliveryDateValidationError ? (
              <p className="text-center text-xs font-medium text-rose-700">{deliveryDateValidationError}</p>
            ) : null}
            {deliveryDateMutation.isError ? (
              <p className="text-center text-xs font-medium text-rose-700">{deliveryDateMutation.error.message}</p>
            ) : null}
            {!draftDeliveryDate && item.deliveryDate ? (
              <p className="text-center text-xs text-muted-foreground">{formatCalendarDate(item.deliveryDate)}</p>
            ) : null}
          </div>
      </td>
      <td className="px-4 py-4 align-middle text-center">
        <div className="flex flex-col items-center gap-2">
          <span
            className="inline-flex"
            title={isLastItem ? "No se puede eliminar el ultimo item de la orden." : "Eliminar item"}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={openDeleteDialog}
              disabled={isDeleting || isLastItem}
              aria-label={`Eliminar item ${item.productName ?? item.id}`}
              className={`h-9 w-9 rounded-full ${isLastItem ? "text-slate-300" : "text-rose-600 hover:bg-rose-50 hover:text-rose-700"}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </span>
          {isDeleting ? (
            <p className="text-center text-xs font-medium text-muted-foreground">Eliminando...</p>
          ) : null}
            {deleteError ? (
              <p className="max-w-[12rem] text-center text-xs font-medium text-rose-700">{deleteError}</p>
            ) : null}
          </div>
        </td>
      </tr>

      {isDeleteDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 px-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`delete-item-title-${item.id}`}
        >
          <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
                Confirmar accion
              </p>
              <h3
                id={`delete-item-title-${item.id}`}
                className="text-2xl font-semibold tracking-tight text-slate-950"
              >
                ¿Eliminar este item?
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Se eliminara de la orden y se recalcularan los totales automaticamente.
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
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                className="bg-rose-600 text-white hover:bg-rose-700"
              >
                {isDeleting ? "Eliminando..." : "Eliminar item"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function OrderItemsTable({ orderId, items }: OrderItemsTableProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <>
      <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
              Order items
            </p>
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                Items de la orden
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Desglose preparado para futura edición de cantidades, precios y atributos.
              </p>
            </div>
          </div>

          <Button type="button" onClick={() => setIsAddModalOpen(true)}>
            Agregar item
          </Button>
        </div>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-border/70">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed divide-y divide-border/70 text-left">
              <caption className="sr-only">
                Items registrados dentro de la orden, con cantidades, precios y contexto del evento.
              </caption>
              <colgroup>
              <col className="w-[260px]" />
              <col className="w-[240px]" />
              <col className="w-[160px]" />
              <col className="w-[155px]" />
              <col className="w-[155px]" />
              <col className="w-[120px]" />
              <col className="w-[170px]" />
              <col className="w-[88px]" />
              </colgroup>
              <thead className="bg-muted/40 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 align-middle font-medium">Producto</th>
                  <th scope="col" className="px-4 py-3 align-middle font-medium">SKU</th>
                  <th scope="col" className="px-4 py-3 align-middle font-medium text-center">Cantidad</th>
                  <th scope="col" className="px-4 py-3 align-middle font-medium text-right">Precio unitario</th>
                  <th scope="col" className="px-4 py-3 align-middle font-medium text-right">Total</th>
                  <th scope="col" className="px-4 py-3 align-middle font-medium">Tema</th>
                  <th scope="col" className="px-4 py-3 align-middle font-medium text-center">Fecha entrega</th>
                  <th scope="col" className="px-4 py-3 align-middle font-medium text-center">
                    <span className="sr-only">Accion</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-white">
                {items.length > 0 ? (
                  items.map((item) => (
                    <OrderItemRow
                      key={item.id}
                      item={item}
                      orderId={orderId}
                      itemCount={items.length}
                    />
                  ))
                ) : (
                  <TableEmptyStateRow
                    colSpan={8}
                    title="Esta orden no tiene items todavía"
                    description="Cuando se registren productos, cantidades y precios aparecerán aquí para revisión operativa."
                  />
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <AddOrderItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        orderId={orderId}
      />
    </>
  );
}

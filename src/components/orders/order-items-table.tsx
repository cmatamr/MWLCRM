"use client";

import { useEffect, useMemo, useState } from "react";

import { TableEmptyStateRow } from "@/components/ui/state-display";
import { useUpdateOrderItemEventDate } from "@/hooks/use-update-order-item-event-date";
import { useUpdateOrderItemQuantity } from "@/hooks/use-update-order-item-quantity";
import { formatCalendarDate, formatCurrencyCRC } from "@/lib/formatters";
import type { OrderItemSummary } from "@/server/services/orders/types";

type OrderItemsTableProps = {
  orderId: string;
  items: OrderItemSummary[];
};

type OrderItemRowProps = {
  item: OrderItemSummary;
  orderId: string;
};

function validateQuantity(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return "La cantidad es obligatoria.";
  }

  if (!/^\d+$/.test(normalized)) {
    return "La cantidad debe ser un entero positivo.";
  }

  const parsed = Number.parseInt(normalized, 10);

  if (parsed <= 0) {
    return "La cantidad debe ser mayor que cero.";
  }

  return null;
}

function validateEventDate(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return "La fecha debe usar el formato YYYY-MM-DD.";
  }

  const parts = normalized.split("-").map((part) => Number(part));

  if (parts.length !== 3) {
    return "La fecha de evento no es valida.";
  }

  const year = parts[0] ?? Number.NaN;
  const month = parts[1] ?? Number.NaN;
  const day = parts[2] ?? Number.NaN;
  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    !Number.isFinite(candidate.getTime()) ||
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return "La fecha de evento no es valida.";
  }

  return null;
}

function OrderItemRow({ item, orderId }: OrderItemRowProps) {
  const quantityMutation = useUpdateOrderItemQuantity(orderId);
  const eventDateMutation = useUpdateOrderItemEventDate(orderId);
  const [draftQuantity, setDraftQuantity] = useState(String(item.quantity));
  const [quantityTouched, setQuantityTouched] = useState(false);
  const [draftEventDate, setDraftEventDate] = useState(item.eventDate ?? "");
  const [eventDateTouched, setEventDateTouched] = useState(false);

  useEffect(() => {
    setDraftQuantity(String(item.quantity));
    setQuantityTouched(false);
  }, [item.quantity]);

  useEffect(() => {
    setDraftEventDate(item.eventDate ?? "");
    setEventDateTouched(false);
  }, [item.eventDate]);

  const validationError = useMemo(() => validateQuantity(draftQuantity), [draftQuantity]);
  const eventDateValidationError = useMemo(() => validateEventDate(draftEventDate), [draftEventDate]);
  const isDirty = draftQuantity.trim() !== String(item.quantity);
  const isDateDirty = draftEventDate.trim() !== (item.eventDate ?? "");
  const isSaving = quantityMutation.isPending;
  const isDateSaving = eventDateMutation.isPending;

  async function handleSave() {
    const error = validateQuantity(draftQuantity);

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

  async function handleEventDateSave() {
    const error = validateEventDate(draftEventDate);

    setEventDateTouched(true);

    if (error || !isDateDirty || isDateSaving) {
      return;
    }

    await eventDateMutation.mutateAsync({
      itemId: item.id,
      eventDate: draftEventDate.trim() || null,
    });
  }

  async function handleEventDateBlur() {
    setEventDateTouched(true);

    if (!isDateDirty || eventDateValidationError || isDateSaving) {
      return;
    }

    await handleEventDateSave();
  }

  function handleEventDateKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleEventDateSave();
      return;
    }

    if (event.key === "Escape") {
      setDraftEventDate(item.eventDate ?? "");
      setEventDateTouched(false);
    }
  }

  const showValidationError = quantityTouched && validationError;
  const showEventDateValidationError = eventDateTouched && eventDateValidationError;

  return (
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
            value={draftEventDate}
            onChange={(event) => setDraftEventDate(event.target.value)}
            onBlur={() => void handleEventDateBlur()}
            onKeyDown={handleEventDateKeyDown}
            disabled={isDateSaving}
            aria-label={`Fecha de evento para ${item.productName ?? item.id}`}
            aria-invalid={showEventDateValidationError ? true : undefined}
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
          {showEventDateValidationError ? (
            <p className="text-center text-xs font-medium text-rose-700">{eventDateValidationError}</p>
          ) : null}
          {eventDateMutation.isError ? (
            <p className="text-center text-xs font-medium text-rose-700">{eventDateMutation.error.message}</p>
          ) : null}
          {!draftEventDate && item.eventDate ? (
            <p className="text-center text-xs text-muted-foreground">{formatCalendarDate(item.eventDate)}</p>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

export function OrderItemsTable({ orderId, items }: OrderItemsTableProps) {
  return (
    <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
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

      <div className="mt-6 overflow-hidden rounded-[24px] border border-border/70">
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed divide-y divide-border/70 text-left">
            <caption className="sr-only">
              Items registrados dentro de la orden, con cantidades, precios y contexto del evento.
            </caption>
            <colgroup>
              <col className="w-[230px]" />
              <col className="w-[360px]" />
              <col className="w-[180px]" />
              <col className="w-[170px]" />
              <col className="w-[170px]" />
              <col className="w-[160px]" />
              <col className="w-[190px]" />
            </colgroup>
            <thead className="bg-muted/40 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 align-middle font-medium">Producto</th>
                <th scope="col" className="px-4 py-3 align-middle font-medium">SKU</th>
                <th scope="col" className="px-4 py-3 align-middle font-medium text-center">Cantidad</th>
                <th scope="col" className="px-4 py-3 align-middle font-medium text-right">Precio unitario</th>
                <th scope="col" className="px-4 py-3 align-middle font-medium text-right">Total</th>
                <th scope="col" className="px-4 py-3 align-middle font-medium">Tema</th>
                <th scope="col" className="px-4 py-3 align-middle font-medium text-center">Fecha Evento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-white">
              {items.length > 0 ? (
                items.map((item) => <OrderItemRow key={item.id} item={item} orderId={orderId} />)
              ) : (
                <TableEmptyStateRow
                  colSpan={7}
                  title="Esta orden no tiene items todavía"
                  description="Cuando se registren productos, cantidades y precios aparecerán aquí para revisión operativa."
                />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

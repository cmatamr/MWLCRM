"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { X, Trash2 } from "lucide-react";

import {
  calculateOrderItemSubtotalCrc,
  calculateOrderItemsSubtotalCrc,
} from "@/domain/crm/orders";
import { useCreateOrder } from "@/hooks/use-create-order";
import { useCustomers } from "@/hooks/use-customers";
import { Button } from "@/components/ui/button";
import { formatCurrencyCRC } from "@/lib/formatters";
import type { CustomerListItem } from "@/server/services/customers/types";
import type { OrderItemProductOption } from "@/server/services/orders/types";

import { validateOrderItemQuantityInput } from "./order-item-form-utils";
import { OrderItemPicker } from "./order-item-picker";

type CreateOrderModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type DraftOrderItem = {
  product: OrderItemProductOption;
  quantityInput: string;
};

function parseDraftQuantity(value: string) {
  const validationError = validateOrderItemQuantityInput(value);

  return {
    validationError,
    quantity: validationError ? null : Number.parseInt(value, 10),
  };
}

export function CreateOrderModal({ isOpen, onClose }: CreateOrderModalProps) {
  const createOrderMutation = useCreateOrder();
  const [customerSearch, setCustomerSearch] = useState("");
  const deferredCustomerSearch = useDeferredValue(customerSearch);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerListItem | null>(null);
  const [draftItems, setDraftItems] = useState<DraftOrderItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const customersQuery = useCustomers({
    page: 1,
    pageSize: 8,
    search: deferredCustomerSearch.trim() || undefined,
    sort: "recent",
  });

  useEffect(() => {
    if (!isOpen) {
      setCustomerSearch("");
      setSelectedCustomer(null);
      setDraftItems([]);
      setFormError(null);
    }
  }, [isOpen]);

  const draftItemSummaries = useMemo(
    () =>
      draftItems.map((item) => {
        const parsed = parseDraftQuantity(item.quantityInput);
        const totalPriceCrc =
          parsed.quantity == null
            ? null
            : calculateOrderItemSubtotalCrc({
                quantity: parsed.quantity,
                unitPriceCrc: item.product.unitPriceCrc,
              });

        return {
          ...item,
          quantity: parsed.quantity,
          validationError: parsed.validationError,
          totalPriceCrc,
        };
      }),
    [draftItems],
  );

  const totalCrc = useMemo(
    () => calculateOrderItemsSubtotalCrc(draftItemSummaries),
    [draftItemSummaries],
  );

  if (!isOpen) {
    return null;
  }

  const customerResults = customersQuery.data?.items ?? [];
  const selectedProductIds = draftItems.map((item) => item.product.id);

  function handleClose() {
    if (createOrderMutation.isPending) {
      return;
    }

    onClose();
  }

  async function handleAddDraftItem(input: { product: OrderItemProductOption; quantity: number }) {
    setFormError(null);

    setDraftItems((current) => [
      ...current,
      {
        product: input.product,
        quantityInput: String(input.quantity),
      },
    ]);
  }

  function updateDraftQuantity(productId: string, quantityInput: string) {
    setDraftItems((current) =>
      current.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              quantityInput,
            }
          : item,
      ),
    );
  }

  function removeDraftItem(productId: string) {
    setDraftItems((current) => current.filter((item) => item.product.id !== productId));
  }

  async function handleSubmit() {
    setFormError(null);

    if (!selectedCustomer) {
      setFormError("Debes seleccionar un cliente para crear la orden.");
      return;
    }

    if (draftItemSummaries.length === 0) {
      setFormError("Debes agregar al menos un item valido antes de guardar.");
      return;
    }

    const invalidDraft = draftItemSummaries.find(
      (item) => item.quantity == null || !item.product.name.trim(),
    );

    if (invalidDraft) {
      setFormError("Corrige las cantidades de los items antes de guardar.");
      return;
    }

    try {
      await createOrderMutation.mutateAsync({
        customerId: selectedCustomer.id,
        items: draftItemSummaries.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity ?? 0,
        })),
      });
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message);
        return;
      }

      setFormError("No se pudo crear la orden.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/25 px-4 py-10 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-order-title"
    >
      <div className="mx-auto w-full max-w-6xl rounded-[32px] border border-white/70 bg-white/95 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
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
              Orders
            </p>
            <div className="space-y-1">
              <h3 id="create-order-title" className="text-2xl font-semibold tracking-tight text-slate-950">
                Nueva orden
              </h3>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                Crear una orden completa en el CRM asociada a un cliente, incluyendo todos los productos
                registrados y el calculo automatico del total basado en los items de la orden.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={handleClose} disabled={createOrderMutation.isPending}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void handleSubmit()} disabled={createOrderMutation.isPending}>
              {createOrderMutation.isPending ? "Guardando..." : "Guardar orden"}
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <section className="space-y-6">
            <div className="rounded-[24px] border border-border/70 bg-slate-50/60 p-5">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Cliente
                </p>
                <h4 className="text-lg font-semibold text-slate-950">Selecciona un cliente existente</h4>
              </div>

              <div className="mt-4 space-y-4">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(event) => setCustomerSearch(event.target.value)}
                  placeholder="Buscar por nombre o identificador"
                  disabled={createOrderMutation.isPending}
                  className="h-11 w-full rounded-[18px] border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />

                {selectedCustomer ? (
                  <div className="rounded-[20px] border border-primary/20 bg-primary/5 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/70">
                      Cliente seleccionado
                    </p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-slate-950">
                          {selectedCustomer.displayName?.trim() || "Cliente sin nombre"}
                        </p>
                        <p className="text-sm text-muted-foreground">{selectedCustomer.externalId}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSelectedCustomer(null);
                          setFormError(null);
                        }}
                        disabled={createOrderMutation.isPending}
                      >
                        Cambiar cliente
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-[20px] border border-border/70 bg-white">
                  <div className="max-h-72 overflow-y-auto p-2">
                    {customersQuery.isLoading ? (
                      <p className="px-3 py-8 text-center text-sm text-muted-foreground">Cargando clientes...</p>
                    ) : null}

                    {customersQuery.isError ? (
                      <p className="px-3 py-8 text-center text-sm font-medium text-rose-700">
                        {customersQuery.error?.message ?? "No se pudieron cargar los clientes."}
                      </p>
                    ) : null}

                    {!customersQuery.isLoading && !customersQuery.isError && customerResults.length === 0 ? (
                      <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No encontramos clientes para esta busqueda.
                      </p>
                    ) : null}

                    {!customersQuery.isLoading && !customersQuery.isError
                      ? customerResults.map((customer) => {
                          const isSelected = selectedCustomer?.id === customer.id;

                          return (
                            <button
                              key={customer.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setFormError(null);
                              }}
                              disabled={createOrderMutation.isPending}
                              className={`flex w-full flex-col gap-1 rounded-[18px] px-4 py-3 text-left transition ${
                                isSelected
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "bg-white text-slate-950 hover:bg-slate-100"
                              }`}
                            >
                              <span className="text-sm font-semibold">
                                {customer.displayName?.trim() || "Cliente sin nombre"}
                              </span>
                              <span
                                className={`text-xs ${
                                  isSelected ? "text-primary-foreground/85" : "text-muted-foreground"
                                }`}
                              >
                                {customer.externalId} • {customer.totalOrders} ordenes
                              </span>
                            </button>
                          );
                        })
                      : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-border/70 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Items
                  </p>
                  <h4 className="text-lg font-semibold text-slate-950">Items de la orden</h4>
                </div>
                <div className="rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground">
                  {draftItems.length} item{draftItems.length === 1 ? "" : "s"}
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-[20px] border border-border/70">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border/70 text-left">
                    <thead className="bg-muted/40 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-medium">Producto</th>
                        <th scope="col" className="px-4 py-3 font-medium">SKU</th>
                        <th scope="col" className="px-4 py-3 font-medium">Cantidad</th>
                        <th scope="col" className="px-4 py-3 font-medium">Precio unitario</th>
                        <th scope="col" className="px-4 py-3 font-medium">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 bg-white">
                      {draftItemSummaries.length > 0 ? (
                        draftItemSummaries.map((item) => (
                          <tr key={item.product.id} className="text-sm text-slate-700">
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-between gap-3">
                                <p className="font-medium text-slate-950">{item.product.name}</p>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeDraftItem(item.product.id)}
                                  disabled={createOrderMutation.isPending}
                                  aria-label={`Eliminar ${item.product.name}`}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </td>
                            <td className="px-4 py-4">{item.product.sku}</td>
                            <td className="px-4 py-4">
                              <div className="space-y-2">
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  min={1}
                                  step={1}
                                  value={item.quantityInput}
                                  onChange={(event) => updateDraftQuantity(item.product.id, event.target.value)}
                                  disabled={createOrderMutation.isPending}
                                  className="h-10 w-24 rounded-full border border-border bg-white px-3 text-center font-medium text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                />
                                {item.validationError ? (
                                  <p className="max-w-28 text-xs font-medium text-rose-700">
                                    {item.validationError}
                                  </p>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              {item.product.unitPriceCrc != null
                                ? formatCurrencyCRC(item.product.unitPriceCrc)
                                : "Pendiente"}
                            </td>
                            <td className="px-4 py-4 font-medium text-slate-950">
                              {item.totalPriceCrc != null ? formatCurrencyCRC(item.totalPriceCrc) : "Pendiente"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                            Agrega al menos un item para calcular el total y habilitar el guardado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-[24px] border border-border/70 bg-white p-5">
              <div className="text-slate-950">
                <div className="space-y-1">
                  <h4 className="text-lg font-semibold">Item</h4>
                  <p className="text-sm text-muted-foreground">Agrega un item del catalogo actual</p>
                </div>
              </div>

              <div className="mt-4">
                <OrderItemPicker
                  isOpen={isOpen}
                  orderId={null}
                  excludeProductIds={selectedProductIds}
                  title="Resumen del item"
                  description="Selecciona un producto real del catalogo para agregarlo a esta nueva orden."
                  submitLabel="Agregar item"
                  isSubmitting={createOrderMutation.isPending}
                  formError={null}
                  onAddItem={handleAddDraftItem}
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-border/70 bg-slate-50/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Resumen de guardado
              </p>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-4">
                  <span>Origen</span>
                  <span className="font-medium text-slate-950">CRM</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Estado</span>
                  <span className="font-medium text-slate-950">Pendiente de pago</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Estado de pago</span>
                  <span className="font-medium text-slate-950">Pendiente de validación</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Total calculado</span>
                  <span className="text-lg font-semibold text-slate-950">{formatCurrencyCRC(totalCrc)}</span>
                </div>
              </div>
            </div>

          </aside>
        </div>
      </div>
    </div>
  );
}

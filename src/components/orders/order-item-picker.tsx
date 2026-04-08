"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useOrderItemProductOptions } from "@/hooks/use-order-item-product-options";
import { formatCurrencyCRC } from "@/lib/formatters";
import type { OrderItemProductOption } from "@/server/services/orders/types";

import { validateOrderItemQuantityInput } from "./order-item-form-utils";

type OrderItemPickerProps = {
  isOpen: boolean;
  orderId: string | null;
  excludeProductIds?: string[];
  title: string;
  description: string;
  submitLabel: string;
  isSubmitting: boolean;
  formError: string | null;
  closeLabel?: string;
  actionOrder?: "close-submit" | "submit-close";
  closeOnSubmitSuccess?: boolean;
  onClose?: () => void;
  onAddItem: (input: { product: OrderItemProductOption; quantity: number }) => Promise<void>;
};

export function OrderItemPicker({
  isOpen,
  orderId,
  excludeProductIds = [],
  title,
  description,
  submitLabel,
  isSubmitting,
  formError,
  closeLabel = "Cancelar",
  actionOrder = "close-submit",
  closeOnSubmitSuccess = false,
  onClose,
  onAddItem,
}: OrderItemPickerProps) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedProduct, setSelectedProduct] = useState<OrderItemProductOption | null>(null);
  const [draftQuantity, setDraftQuantity] = useState("1");
  const [quantityTouched, setQuantityTouched] = useState(false);
  const productsQuery = useOrderItemProductOptions(orderId, deferredSearch, isOpen);
  const quantityValidationError = useMemo(
    () => validateOrderItemQuantityInput(draftQuantity),
    [draftQuantity],
  );

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setSelectedProduct(null);
      setDraftQuantity("1");
      setQuantityTouched(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedProduct && excludeProductIds.includes(selectedProduct.id)) {
      setSelectedProduct(null);
    }
  }, [excludeProductIds, selectedProduct]);

  if (!isOpen) {
    return null;
  }

  const availableProducts = (productsQuery.data ?? []).filter(
    (product) => !excludeProductIds.includes(product.id),
  );
  const hasSearch = deferredSearch.trim().length > 0;

  async function handleSubmit() {
    setQuantityTouched(true);

    if (!selectedProduct || quantityValidationError || isSubmitting) {
      return;
    }

    await onAddItem({
      product: selectedProduct,
      quantity: Number.parseInt(draftQuantity, 10),
    });

    setSearch("");
    setSelectedProduct(null);
    setDraftQuantity("1");
    setQuantityTouched(false);

    if (closeOnSubmitSuccess) {
      onClose?.();
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="order-item-product-search" className="text-sm font-medium text-slate-950">
          Producto
        </label>
        <input
          id="order-item-product-search"
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre o SKU"
          className="h-11 w-full rounded-[18px] border border-border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <p className="text-xs text-muted-foreground">
          {orderId
            ? "Se muestran productos que todavia no existen en esta orden."
            : "Se muestran productos activos del catalogo para construir la orden."}
        </p>
      </div>

      <div className="rounded-[22px] border border-border/70 bg-slate-50/70">
        <div className="max-h-72 overflow-y-auto p-2">
          {productsQuery.isLoading ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Cargando productos...</p>
          ) : null}

          {productsQuery.isError ? (
            <p className="px-3 py-8 text-center text-sm font-medium text-rose-700">
              {productsQuery.error?.message ?? "No se pudieron cargar los productos."}
            </p>
          ) : null}

          {!productsQuery.isLoading && !productsQuery.isError && availableProducts.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {hasSearch
                ? "No encontramos productos que coincidan con esta busqueda."
                : "No hay mas productos disponibles para agregar en este momento."}
            </p>
          ) : null}

          {!productsQuery.isLoading && !productsQuery.isError
            ? availableProducts.map((product) => {
                const isSelected = selectedProduct?.id === product.id;

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setSelectedProduct(product)}
                    className={`flex w-full flex-col gap-1 rounded-[18px] px-4 py-3 text-left transition ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-white text-slate-950 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-sm font-semibold">{product.name}</span>
                    <span
                      className={`text-xs ${
                        isSelected ? "text-primary-foreground/85" : "text-muted-foreground"
                      }`}
                    >
                      {product.sku}{" "}
                      {product.unitPriceCrc != null ? `• ${formatCurrencyCRC(product.unitPriceCrc)}` : ""}
                    </span>
                  </button>
                );
              })
            : null}
        </div>
      </div>

      <div className="rounded-[22px] border border-border/70 bg-white px-4 py-4">
        <p className="text-sm font-medium text-slate-950">{title}</p>
        {selectedProduct ? (
          <div className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Producto</p>
              <p className="mt-1 font-medium text-slate-950">{selectedProduct.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">SKU</p>
              <p className="mt-1 font-medium text-slate-950">{selectedProduct.sku}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Cantidad</p>
              <div className="mt-1 space-y-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={draftQuantity}
                  onChange={(event) => {
                    setDraftQuantity(event.target.value);
                    setQuantityTouched(true);
                  }}
                  disabled={isSubmitting}
                  aria-label="Cantidad del item"
                  aria-invalid={quantityTouched && quantityValidationError ? true : undefined}
                  className="h-11 w-28 rounded-full border border-border bg-white px-4 text-center font-medium text-slate-950 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted"
                />
                {quantityTouched && quantityValidationError ? (
                  <p className="text-xs font-medium text-rose-700">{quantityValidationError}</p>
                ) : null}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Precio unitario</p>
              <p className="mt-1 font-medium text-slate-950">
                {selectedProduct.unitPriceCrc != null
                  ? formatCurrencyCRC(selectedProduct.unitPriceCrc)
                  : "Pendiente"}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {formError ? (
        <p className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {actionOrder === "submit-close" ? (
          <>
            <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting || !selectedProduct}>
              {isSubmitting ? "Guardando..." : submitLabel}
            </Button>
            {onClose ? (
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                {closeLabel}
              </Button>
            ) : null}
          </>
        ) : (
          <>
            {onClose ? (
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                {closeLabel}
              </Button>
            ) : null}
            <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting || !selectedProduct}>
              {isSubmitting ? "Guardando..." : submitLabel}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

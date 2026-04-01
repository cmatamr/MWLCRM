export function validateOrderItemQuantityInput(value: string) {
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

export function validateOrderItemEventDateInput(value: string) {
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

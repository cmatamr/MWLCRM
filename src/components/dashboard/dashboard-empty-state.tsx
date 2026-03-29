import { StateDisplay } from "@/components/ui/state-display";

export function DashboardEmptyState() {
  return (
    <StateDisplay
      eyebrow="Dashboard"
      title="Tu operación todavía no tiene datos para resumir"
      description="Cuando entren órdenes, campañas o conversaciones al CRM, este espacio mostrará revenue, actividad comercial y progreso del funnel con datos reales."
    />
  );
}

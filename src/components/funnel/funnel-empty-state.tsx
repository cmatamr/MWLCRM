import { StateDisplay } from "@/components/ui/state-display";

export function FunnelEmptyState() {
  return (
    <StateDisplay
      eyebrow="Funnel"
      title="Todavía no hay datos suficientes para analizar el funnel"
      description="Cuando existan leads, historial de etapas u objeciones detectadas, este módulo mostrará avance por etapa, puntos de fricción y conversaciones potencialmente estancadas."
    />
  );
}

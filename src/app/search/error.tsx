"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StateDisplay } from "@/components/ui/state-display";

type SearchErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function SearchErrorPage({ error, reset }: SearchErrorPageProps) {
  return (
    <div className="py-8">
      <StateDisplay
        eyebrow="Search error"
        title="No pudimos cargar la búsqueda"
        description={
          error.message?.trim()
            ? `La búsqueda global falló con este mensaje: ${error.message}`
            : "La búsqueda global encontró un problema inesperado mientras consultaba el CRM."
        }
        tone="error"
        action={
          <Button type="button" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
            Reintentar
          </Button>
        }
      />
    </div>
  );
}

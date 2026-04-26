"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StateDisplay } from "@/components/ui/state-display";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error: _error, reset }: ErrorPageProps) {
  return (
    <div className="py-8">
      <StateDisplay
        eyebrow="Error"
        title="No pudimos cargar esta vista"
        description="La aplicación encontró un problema inesperado mientras intentaba cargar el módulo."
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

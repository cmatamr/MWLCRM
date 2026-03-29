"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StateDisplay } from "@/components/ui/state-display";

type GlobalErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalErrorPage({ error, reset }: GlobalErrorPageProps) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        <main className="mx-auto flex min-h-screen max-w-[960px] items-center px-4 py-10">
          <StateDisplay
            eyebrow="Error"
            title="El CRM no pudo inicializarse"
            description={
              error.message?.trim()
                ? `Ocurrió un error al cargar la aplicación: ${error.message}`
                : "Ocurrió un error al cargar la aplicación. Puedes intentar nuevamente."
            }
            tone="error"
            action={
              <Button type="button" onClick={reset}>
                <RotateCcw className="h-4 w-4" />
                Reintentar
              </Button>
            }
            className="w-full"
          />
        </main>
      </body>
    </html>
  );
}

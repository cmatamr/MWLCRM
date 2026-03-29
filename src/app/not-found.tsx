import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StateDisplay } from "@/components/ui/state-display";

export default function NotFoundPage() {
  return (
    <div className="py-8">
      <StateDisplay
        eyebrow="No Encontrado"
        title="No encontramos el recurso que buscas"
        description="Es posible que el registro ya no exista, el enlace esté incompleto o todavía no haya sido sincronizado."
        icon={SearchX}
        tone="error"
        action={
          <Button asChild>
            <Link href="/dashboard">Volver al dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}

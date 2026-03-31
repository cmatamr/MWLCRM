import type { OrderDetail } from "@/server/services/orders/types";

type OrderNotesCardProps = {
  notes: OrderDetail["notes"];
};

export function OrderNotesCard({ notes }: OrderNotesCardProps) {
  return (
    <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
          Notes
        </p>
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Notas internas
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Contexto operativo para seguimiento comercial, validaciones y producción.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-[24px] border border-border/70 bg-slate-50/70 p-4">
        {notes?.trim() ? (
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{notes}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Esta orden no tiene notas registradas todavía.
          </p>
        )}
      </div>
    </section>
  );
}

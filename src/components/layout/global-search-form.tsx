"use client";

import { useRef } from "react";
import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";

export function GlobalSearchForm() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action="/search"
      method="get"
      role="search"
      className="flex w-full items-center gap-3 rounded-full border border-border bg-white px-4 py-2 shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background sm:min-w-80 xl:min-w-[360px]"
    >
      <label htmlFor="global-search-input" className="sr-only">
        Buscar clientes, ordenes o campanas
      </label>
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <input
        id="global-search-input"
        name="q"
        type="search"
        defaultValue={query}
        placeholder="Buscar clientes, órdenes o campañas"
        className="h-10 w-full border-0 bg-transparent text-sm text-slate-900 placeholder:text-muted-foreground focus:outline-none"
        autoComplete="off"
        onKeyDown={(event) => {
          if (event.key !== "Enter") {
            return;
          }

          event.preventDefault();
          formRef.current?.requestSubmit();
        }}
      />
      <button
        type="submit"
        aria-label="Ejecutar búsqueda global"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
}

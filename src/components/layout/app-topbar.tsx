import { Suspense } from "react";
import { Bell } from "lucide-react";

import { GlobalSearchForm } from "@/components/layout/global-search-form";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";

export function AppTopbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/70 bg-background/80 px-4 py-4 backdrop-blur md:px-6 lg:px-8 xl:px-10">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary/70">
              Made With Love CRM
            </p>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900">
              Operación comercial centralizada
            </h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
            <Suspense fallback={<div className="h-14 w-full sm:min-w-80 xl:min-w-[360px]" />}>
              <GlobalSearchForm />
            </Suspense>
            <Button variant="outline" size="icon" aria-label="Notificaciones">
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <MobileNav />
      </div>
    </header>
  );
}

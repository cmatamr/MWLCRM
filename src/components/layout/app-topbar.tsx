import { Suspense } from "react";
import { Bell } from "lucide-react";

import { GlobalSearchForm } from "@/components/layout/global-search-form";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";

export function AppTopbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/70 bg-background/80 px-4 py-4 backdrop-blur md:px-6 lg:px-8 xl:px-10">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-base font-semibold tracking-[0.07em] text-primary/80">
              NexaCore by 4 + [ UNO ]
            </p>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 md:text-[1.75rem]">
              Operación Comerial Centralizada
            </h1>
            <p className="mt-1 text-sm italic text-muted-foreground">Operando Made With Love</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
            <Suspense fallback={<div className="h-14 w-full sm:min-w-80 xl:min-w-[360px]" />}>
              <GlobalSearchForm />
            </Suspense>
            <Button variant="outline" size="icon" aria-label="Notificaciones">
              <Bell className="h-4 w-4" />
            </Button>
            <UserMenu />
          </div>
        </div>
        <MobileNav />
      </div>
    </header>
  );
}

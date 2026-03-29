import type { ReactNode } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1760px]">
        <AppSidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <AppTopbar />
          <main className="flex-1 px-4 pb-8 pt-6 md:px-6 md:pb-10 lg:px-8 xl:px-10">
            <div className="mx-auto w-full max-w-[1320px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

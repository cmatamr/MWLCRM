"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness } from "lucide-react";

import { navigationItems } from "@/config/navigation";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-80 shrink-0 border-r border-white/60 bg-[radial-gradient(circle_at_18%_10%,rgba(14,116,144,0.08),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.8),rgba(255,255,255,0.68))] px-5 py-6 backdrop-blur xl:block">
      <div className="flex h-full flex-col rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_18%_10%,rgba(14,116,144,0.24),transparent_38%),radial-gradient(circle_at_85%_92%,rgba(56,189,248,0.2),transparent_44%),linear-gradient(165deg,#020617_0%,#020b22_56%,#03123a_100%)] px-4 py-5 text-white shadow-[0_34px_62px_-30px_rgba(2,6,23,0.88),0_14px_30px_-16px_rgba(2,6,23,0.68)]">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-4"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-200">
            <BriefcaseBusiness className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="font-serif text-base font-semibold leading-tight md:text-lg">
              RevenueCore
              <br />
              <span className="text-[0.95rem] italic font-medium text-slate-300">by 4 + [ UNO ]</span>
            </p>
            <p className="text-sm italic text-slate-300">Workspace: Made With Love</p>
          </div>
        </Link>

        <nav className="mt-6 flex-1 space-y-2">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-start gap-3 rounded-2xl px-4 py-3 transition-all duration-200 hover:-translate-y-[2px] hover:scale-[1.02]",
                  isActive
                    ? "bg-white text-slate-950 ring-1 ring-white/75 shadow-[0_18px_34px_-16px_rgba(2,6,23,0.52),0_8px_18px_-10px_rgba(2,6,23,0.38)]"
                    : "text-slate-300 hover:bg-white/10 hover:text-white",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 rounded-xl p-2",
                    isActive
                      ? "bg-slate-100 text-primary"
                      : "bg-white/5 text-slate-300 group-hover:bg-white/10",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p
                    className={cn(
                      "text-xs leading-relaxed",
                      isActive ? "text-slate-500" : "text-slate-400",
                    )}
                  >
                    {item.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 px-1 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#FFFFFF]">
            Powered by RevenueCore
          </p>
          <p className="mt-1 text-xs italic text-slate-300">by 4 + [ UNO ] Technology</p>
        </div>
      </div>
    </aside>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { getVisibleNavigationItems } from "@/config/navigation";
import type { AppRole } from "@/lib/auth/profile";
import { fetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();
  const { data: role } = useQuery({
    queryKey: ["account-security", "role"],
    queryFn: async () => {
      const response = await fetcher<{ role: AppRole }>("/api/account/security");
      return response.role;
    },
    retry: 0,
  });
  const visibleNavigationItems = getVisibleNavigationItems(role);

  return (
    <aside className="hidden w-80 shrink-0 border-r border-white/60 bg-[radial-gradient(circle_at_18%_10%,rgba(14,116,144,0.08),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.8),rgba(255,255,255,0.68))] px-5 py-6 backdrop-blur xl:flex">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_18%_10%,rgba(14,116,144,0.24),transparent_38%),radial-gradient(circle_at_85%_92%,rgba(56,189,248,0.2),transparent_44%),linear-gradient(165deg,#020617_0%,#020b22_56%,#03123a_100%)] px-4 py-5 text-white shadow-[0_34px_62px_-30px_rgba(2,6,23,0.88),0_14px_30px_-16px_rgba(2,6,23,0.68)]">
        <Link
          href="/dashboard"
          className="relative flex shrink-0 items-center gap-3 rounded-3xl border border-white/30 bg-[linear-gradient(145deg,rgba(255,255,255,0.16),rgba(255,255,255,0.06))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_18px_30px_-20px_rgba(2,6,23,0.9)]"
        >
          <div className="h-24 w-24 shrink-0 rounded-2xl bg-transparent p-1 [perspective:900px]">
            <Image
              src="/ontraone-icon.png"
              alt="OntraOne icon"
              width={120}
              height={120}
              className="logo-float-3d h-full w-full bg-transparent object-contain object-center"
              priority
            />
          </div>
          <div className="space-y-1">
            <p className="font-serif text-lg font-semibold leading-tight text-slate-50 [text-shadow:0_3px_16px_rgba(2,6,23,0.65)] md:text-xl">
              OntraOne
              <br />
              <span className="text-[0.95rem] italic font-medium text-slate-200">by 4 + [ UNO ]</span>
            </p>
            <p className="text-sm italic text-slate-200/95">
              Workspace:
              <br />
              Made With Love
            </p>
          </div>
        </Link>

        <nav className="mt-6 space-y-2">
          {visibleNavigationItems.map((item) => {
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

        <div className="mt-auto shrink-0 px-1 pt-6 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#FFFFFF]">
            Powered by OntraOne
          </p>
          <p className="mt-1 text-xs italic text-slate-300">by 4 + [ UNO ] Technology</p>
        </div>
      </div>
    </aside>
  );
}

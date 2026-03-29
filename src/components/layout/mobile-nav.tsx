"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navigationItems } from "@/config/navigation";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto pb-1 xl:hidden">
      {navigationItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-white text-slate-700 hover:bg-muted",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

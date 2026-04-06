"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { LogOut, ShieldCheck, UserRound } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isAppRole, type AppRole } from "@/lib/auth/profile";
import { Button } from "@/components/ui/button";

type UserProfileRow = {
  full_name: string | null;
  role: string;
  is_active: boolean;
};

type UserMenuState = {
  email: string | null;
  fullName: string | null;
  role: AppRole | null;
};

const EMPTY_STATE: UserMenuState = {
  email: null,
  fullName: null,
  role: null,
};

function getInitials(name: string | null, email: string | null): string {
  const base = (name ?? email ?? "").trim();
  if (!base) {
    return "U";
  }

  const words = base.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return (words[0] ?? "U").slice(0, 2).toUpperCase();
  }

  return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
}

function roleLabel(role: AppRole | null): string {
  if (role === "admin") {
    return "Admin";
  }

  if (role === "agent") {
    return "Agent";
  }

  return "Sin rol";
}

export function UserMenu() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<UserMenuState>(EMPTY_STATE);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active || !user) {
        if (active) {
          setState(EMPTY_STATE);
        }
        return;
      }

      const { data: profile } = await supabase
        .from("app_user_profiles")
        .select("full_name, role, is_active")
        .eq("id", user.id)
        .maybeSingle<UserProfileRow>();

      if (!active) {
        return;
      }

      setState({
        email: user.email ?? null,
        fullName: profile?.full_name ?? null,
        role: profile?.role && isAppRole(profile.role) ? profile.role : null,
      });
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadUser();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current) {
        return;
      }

      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const initials = getInitials(state.fullName, state.email);
  const displayName = state.fullName ?? state.email ?? "Usuario";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background px-2.5 text-left transition hover:bg-muted"
        aria-expanded={isOpen}
        aria-label="Abrir menu de usuario"
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
          {initials}
        </span>
        <UserRound className="h-4 w-4 text-slate-700" />
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-border bg-white p-3 shadow-xl">
          <div className="space-y-1 rounded-xl bg-slate-50 p-3">
            <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
            <p className="truncate text-xs text-slate-600">{state.email ?? "Sin correo"}</p>
            <p className="inline-flex items-center gap-1 text-xs font-medium text-slate-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              {roleLabel(state.role)}
            </p>
          </div>

          <div className="mt-3">
            <Button asChild variant="outline" className="w-full justify-start rounded-xl">
              <Link href="/auth/logout" onClick={() => setIsOpen(false)}>
                <LogOut className="h-4 w-4" />
                Log out
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

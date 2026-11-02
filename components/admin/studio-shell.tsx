"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Building2,
  ExternalLink,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  MessagesSquare,
  Settings2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_NAV } from "@/lib/constants";

const ICONS = {
  LayoutDashboard,
  Building2,
  MessagesSquare,
  Images,
  Settings2,
} as const;

export function StudioShell({
  children,
  ownerName,
  ownerEmail,
  businessName,
  provider,
}: {
  children: React.ReactNode;
  ownerName: string;
  ownerEmail: string;
  businessName: string;
  provider: "supabase" | "local";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        headers: { Origin: window.location.origin },
      });
      router.replace("/admin/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const navigation = (
    <nav aria-label="Studio" className="flex flex-1 flex-col gap-1 px-3">
      {ADMIN_NAV.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 border-l-2 px-3.5 py-3 text-[0.78rem] transition-colors",
              active
                ? "border-gold bg-gold/[0.07] text-ivory"
                : "border-transparent text-silver/65 hover:border-white/15 hover:bg-white/[0.03] hover:text-ivory",
            )}
          >
            <Icon aria-hidden="true" className={cn("h-4 w-4", active ? "text-gold" : "text-silver/50 group-hover:text-gold/70")} />
            {item.label}
          </Link>
        );
      })}
      <Link
        href="/admin/properties/new"
        onClick={() => setOpen(false)}
        className="mt-4 flex items-center justify-center gap-2 border border-gold/35 px-3 py-2.5 text-[0.66rem] uppercase tracking-[0.16em] text-gold transition-colors hover:bg-gold hover:text-imperial"
      >
        <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
        Add property
      </Link>
    </nav>
  );

  const sidebarBody = (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/[0.07] px-5 py-5">
        <p className="text-[0.55rem] uppercase tracking-[0.28em] text-gold/80">Owner Studio</p>
        <p className="mt-2 truncate font-display text-lg tracking-[0.1em] text-ivory">
          {businessName.toUpperCase()}
        </p>
        <p className="mt-1 text-[0.62rem] text-silver/40">
          {provider === "supabase" ? "Supabase · live" : "Preview provider · local"}
        </p>
      </div>

      {navigation}

      <div className="mt-auto border-t border-white/[0.07] px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center border border-gold/25 font-display text-sm text-gold">
            {ownerName.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[0.76rem] text-ivory">{ownerName}</p>
            <p className="truncate text-[0.62rem] text-silver/45">{ownerEmail}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 border border-white/10 px-2 py-2 text-[0.58rem] uppercase tracking-[0.14em] text-silver/70 transition-colors hover:border-gold/40 hover:text-gold"
          >
            <ExternalLink aria-hidden="true" className="h-3 w-3" />
            Site
          </Link>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="inline-flex items-center justify-center gap-1.5 border border-white/10 px-2 py-2 text-[0.58rem] uppercase tracking-[0.14em] text-silver/70 transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-50"
          >
            <LogOut aria-hidden="true" className="h-3 w-3" />
            {signingOut ? "…" : "Sign out"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="studio-shell">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] border-r border-white/[0.07] bg-[#0a0d13] lg:block">
        {sidebarBody}
      </aside>

      {/* Mobile drawer */}
      <div className={cn("fixed inset-0 z-50 lg:hidden", open ? "pointer-events-auto" : "pointer-events-none")}>
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          className={cn("absolute inset-0 bg-imperial/80 backdrop-blur-sm transition-opacity", open ? "opacity-100" : "opacity-0")}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Studio navigation"
          className={cn(
            "absolute inset-y-0 left-0 w-[280px] border-r border-white/10 bg-[#0a0d13] transition-transform duration-400 ease-luxe",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="absolute right-3 top-4 grid h-9 w-9 place-items-center text-silver hover:text-gold"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
          {sidebarBody}
        </div>
      </div>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-white/[0.07] bg-[#08090d]/90 px-5 py-3.5 backdrop-blur-xl lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open studio navigation"
              aria-expanded={open}
              className="grid h-9 w-9 place-items-center border border-white/12 text-ivory transition-colors hover:border-gold/40 hover:text-gold lg:hidden"
            >
              <Menu aria-hidden="true" className="h-4 w-4" />
            </button>
            <div>
              <p className="text-[0.55rem] uppercase tracking-[0.24em] text-silver/40">Control Studio</p>
              <p className="text-[0.78rem] text-ivory/85">
                {businessName} <span className="text-silver/30">/</span>{" "}
                {ADMIN_NAV.find((item) => isActive(item.href))?.label ?? "Overview"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/" className="hidden text-[0.62rem] uppercase tracking-[0.16em] text-silver/50 transition-colors hover:text-gold sm:block">
              View website
            </Link>
            <span className="hidden h-4 w-px bg-white/10 sm:block" />
            <button
              type="button"
              onClick={signOut}
              className="text-[0.62rem] uppercase tracking-[0.16em] text-silver/50 transition-colors hover:text-danger"
            >
              Sign out
            </button>
          </div>
        </header>

        <main id="main-content" className="px-5 py-7 lg:px-8 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}

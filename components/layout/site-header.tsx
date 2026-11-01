"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, Phone, X } from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";
import { PUBLIC_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface HeaderProps {
  businessName: string;
  tagline: string;
  logoUrl: string | null;
  phone: string;
  hours: string;
}

export function SiteHeader({ businessName, tagline, logoUrl, phone, hours }: HeaderProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const isHome = pathname === "/";
  const transparent = isHome && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-700 ease-luxe",
          transparent
            ? "border-b border-transparent bg-gradient-to-b from-imperial/80 via-imperial/30 to-transparent py-5"
            : "border-b border-white/[0.07] bg-imperial/92 py-3 shadow-[0_20px_50px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl",
        )}
      >
        <div className="shell flex items-center justify-between gap-6">
          <BrandMark
            businessName={businessName}
            tagline={tagline}
            logoUrl={logoUrl}
            size={transparent ? "md" : "sm"}
            className="shrink-0"
          />

          <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
            {PUBLIC_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="nav-link"
                data-active={isActive(item.href) ? "true" : "false"}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 sm:gap-5">
            <a
              href={`tel:${phone.replace(/[^\d+]/g, "")}`}
              className="hidden items-center gap-2 text-[0.68rem] uppercase tracking-[0.18em] text-ivory/65 transition-colors hover:text-gold xl:flex"
            >
              <Phone aria-hidden="true" className="h-3.5 w-3.5 text-gold/70" />
              {phone}
            </a>
            <Link href="/contact" className="btn-outline btn-sm hidden sm:inline-flex">
              Enquire
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="mobile-navigation"
              className="grid h-10 w-10 place-items-center border border-white/15 text-ivory transition-colors hover:border-gold/50 hover:text-gold lg:hidden"
            >
              <Menu aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile / tablet navigation overlay */}
      <div
        id="mobile-navigation"
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        className={cn(
          "fixed inset-0 z-[60] lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 bg-imperial/80 backdrop-blur-sm transition-opacity duration-500",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          className={cn(
            "absolute inset-y-0 right-0 flex h-full w-full max-w-[440px] flex-col border-l border-gold/20 bg-obsidian transition-transform duration-500 ease-luxe",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5">
            <BrandMark businessName={businessName} tagline={tagline} logoUrl={logoUrl} size="sm" />
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="grid h-10 w-10 place-items-center border border-white/15 text-ivory transition-colors hover:border-gold/50 hover:text-gold"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>

          <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-6 py-8">
            <ul className="space-y-1">
              {PUBLIC_NAV.map((item, index) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center justify-between border-b border-white/[0.06] py-4 font-display text-3xl transition-colors",
                      isActive(item.href) ? "text-gold" : "text-ivory hover:text-gold-soft",
                    )}
                  >
                    {item.label}
                    <span className="font-sans text-[0.6rem] tracking-[0.2em] text-silver/40">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-10 space-y-6 text-sm">
              <div>
                <p className="eyebrow-plain mb-2 text-[0.58rem]">Private Enquiries</p>
                <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="block text-ivory hover:text-gold">
                  {phone}
                </a>
                <p className="mt-1 text-silver/70">{hours}</p>
              </div>
              <div className="flex flex-col gap-3">
                <Link href="/contact" onClick={() => setOpen(false)} className="btn-gold w-full">
                  Request a consultation
                </Link>
                <Link href="/properties" onClick={() => setOpen(false)} className="btn-ivory w-full">
                  Browse properties
                </Link>
              </div>
            </div>
          </nav>

          <div className="safe-bottom border-t border-white/[0.08] px-6 pt-4">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="text-[0.62rem] uppercase tracking-[0.24em] text-silver/50 transition-colors hover:text-gold"
            >
              Settings
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

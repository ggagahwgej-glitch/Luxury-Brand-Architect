import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Lock, Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { getSiteSettings } from "@/lib/data";
import { PageHero } from "@/components/layout/page-hero";
import { DisplayPreferences } from "@/components/settings/display-preferences";
import { LEGAL_LINKS } from "@/lib/config/site";
import { telLink, whatsappLink } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings",
  description: "Contact preferences, display settings and owner access for the Aurum Estates website.",
  alternates: { canonical: "/settings" },
  robots: { index: true, follow: true },
};

export default async function SettingsPage() {
  const settings = await getSiteSettings();
  const wa = whatsappLink(settings.contact.whatsapp, "Hello, I would like to enquire about a property.");
  const tel = telLink(settings.contact.phone);

  return (
    <>
      <PageHero
        size="sm"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Settings" }]}
        eyebrow="Preferences"
        title={
          <>
            Site <span className="italic text-gold-soft">settings</span>
          </>
        }
        description="Contact preferences, accessibility options and — for the owner — a discreet entry point to the private studio."
      />

      <section className="shell grid gap-6 py-14 sm:py-20 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="border border-white/[0.08] bg-navy/25 p-6">
            <h2 className="font-display text-xl text-ivory">Contact preferences</h2>
            <p className="mt-2 text-[0.8rem] leading-relaxed text-silver/65">
              Choose the channel that suits you. All three reach the same advisory team.
            </p>
            <div className="mt-5 space-y-3">
              <a
                href={tel ?? "#"}
                className="flex items-center gap-3 border border-white/[0.08] px-4 py-3 text-[0.84rem] text-ivory transition-colors hover:border-gold/40 hover:text-gold"
              >
                <Phone aria-hidden="true" className="h-4 w-4 text-gold/70" />
                {settings.contact.phone}
                <span className="ml-auto text-[0.6rem] uppercase tracking-[0.16em] text-silver/45">Call</span>
              </a>
              {wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 border border-white/[0.08] px-4 py-3 text-[0.84rem] text-ivory transition-colors hover:border-gold/40 hover:text-gold"
                >
                  <MessageCircle aria-hidden="true" className="h-4 w-4 text-gold/70" />
                  WhatsApp
                  <span className="ml-auto text-[0.6rem] uppercase tracking-[0.16em] text-silver/45">Message</span>
                </a>
              ) : null}
              <a
                href={`mailto:${settings.contact.email}`}
                className="flex items-center gap-3 border border-white/[0.08] px-4 py-3 text-[0.84rem] text-ivory transition-colors hover:border-gold/40 hover:text-gold"
              >
                <Mail aria-hidden="true" className="h-4 w-4 text-gold/70" />
                {settings.contact.email}
                <span className="ml-auto text-[0.6rem] uppercase tracking-[0.16em] text-silver/45">Email</span>
              </a>
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-display text-xl text-ivory">Display</h2>
            <DisplayPreferences />
          </div>

          <div className="border border-white/[0.08] bg-navy/25 p-6">
            <h2 className="font-display text-xl text-ivory">Legal</h2>
            <ul className="mt-4 space-y-3">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex items-center justify-between border-b border-white/[0.06] pb-3 text-[0.84rem] text-silver/80 transition-colors hover:text-gold"
                  >
                    {link.label}
                    <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="relative overflow-hidden border border-gold/20 bg-gradient-to-b from-navy/50 to-imperial/80 p-6 sm:p-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center border border-gold/30 text-gold">
                <Lock aria-hidden="true" className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[0.58rem] uppercase tracking-[0.24em] text-gold/80">Owner Access</p>
                <h2 className="font-display text-xl text-ivory">Private Studio</h2>
              </div>
            </div>

            <p className="mt-5 text-[0.82rem] leading-relaxed text-silver/75">
              The Owner Studio is the private management area for this website — properties, media, enquiries and site
              settings. Access requires the registered owner email, password and the permanent 12-digit access code.
            </p>

            <ul className="mt-5 space-y-2.5 text-[0.74rem] text-silver/60">
              <li className="flex items-start gap-2">
                <ShieldCheck aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold/60" />
                Server-side verification on every request
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold/60" />
                Rate limiting and temporary lockout after repeated failures
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold/60" />
                HttpOnly, signed 8-hour session
              </li>
            </ul>

            <Link href="/admin/login" className="btn-outline mt-7 w-full">
              Owner sign in
            </Link>
            <p className="mt-3 text-center text-[0.62rem] text-silver/40">
              Authorised personnel only. Attempts are logged.
            </p>
          </div>

          <div className="border border-white/[0.08] bg-navy/25 p-6">
            <h2 className="font-display text-xl text-ivory">About this website</h2>
            <dl className="mt-4 space-y-3 text-[0.76rem]">
              <div className="flex items-baseline justify-between gap-4 border-b border-white/[0.06] pb-2.5">
                <dt className="text-silver/50">Business</dt>
                <dd className="text-right text-ivory/85">{settings.branding.businessName}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-white/[0.06] pb-2.5">
                <dt className="text-silver/50">Registered office</dt>
                <dd className="max-w-[60%] text-right text-ivory/85">{settings.contact.address}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-silver/50">Content updated</dt>
                <dd className="text-right text-ivory/85">
                  {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(
                    new Date(settings.updatedAt),
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}

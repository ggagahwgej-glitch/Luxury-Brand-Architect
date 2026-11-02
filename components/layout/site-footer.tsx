import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { FacebookIcon, InstagramIcon, LinkedInIcon, YouTubeIcon } from "@/components/ui/social-icons";
import { BrandMark } from "@/components/layout/brand-mark";
import { COLLECTIONS, PUBLIC_NAV } from "@/lib/constants";
import { LEGAL_LINKS } from "@/lib/config/site";
import { telLink, whatsappLink } from "@/lib/format";
import type { SiteSettings } from "@/lib/types";

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const { branding, contact, social } = settings;
  const wa = whatsappLink(contact.whatsapp, `Hello ${branding.businessName}, I would like to enquire about a property.`);
  const socials = [
    { href: social.facebook, label: "Facebook", Icon: FacebookIcon },
    { href: social.instagram, label: "Instagram", Icon: InstagramIcon },
    { href: social.linkedin, label: "LinkedIn", Icon: LinkedInIcon },
    { href: social.youtube, label: "YouTube", Icon: YouTubeIcon },
  ].filter((item) => item.href);

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-white/[0.07] bg-imperial">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      <div className="shell grid gap-12 py-16 sm:py-20 lg:grid-cols-[1.4fr_0.7fr_0.9fr_1.1fr] lg:gap-10">
        <div className="max-w-sm">
          <BrandMark businessName={branding.businessName} tagline={branding.tagline} logoUrl={branding.logoUrl} />
          <p className="mt-6 text-[0.85rem] leading-relaxed text-silver/80">{branding.description}</p>
          <div className="mt-7 flex items-center gap-3">
            {socials.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="grid h-9 w-9 place-items-center border border-white/12 text-silver transition-colors hover:border-gold/50 hover:text-gold"
              >
                <Icon aria-hidden="true" className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        </div>

        <nav aria-label="Footer navigation">
          <h2 className="eyebrow-plain mb-5 text-[0.58rem]">Navigate</h2>
          <ul className="space-y-3">
            {PUBLIC_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-[0.82rem] text-silver/80 transition-colors hover:text-gold">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/categories" className="text-[0.82rem] text-silver/80 transition-colors hover:text-gold">
                Collections
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Property collections">
          <h2 className="eyebrow-plain mb-5 text-[0.58rem]">Collections</h2>
          <ul className="space-y-3">
            {COLLECTIONS.slice(0, 6).map((collection) => (
              <li key={collection.slug}>
                <Link
                  href={`/properties?type=${collection.types[0]}`}
                  className="text-[0.82rem] text-silver/80 transition-colors hover:text-gold"
                >
                  {collection.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="eyebrow-plain mb-5 text-[0.58rem]">Private Office</h2>
          <ul className="space-y-4 text-[0.82rem] text-silver/85">
            <li className="flex gap-3">
              <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-gold/70" />
              <span>{contact.address}</span>
            </li>
            <li className="flex gap-3">
              <Phone aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-gold/70" />
              <a href={telLink(contact.phone) ?? "#"} className="transition-colors hover:text-gold">
                {contact.phone}
              </a>
            </li>
            <li className="flex gap-3">
              <Mail aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-gold/70" />
              <a href={`mailto:${contact.email}`} className="transition-colors hover:text-gold">
                {contact.email}
              </a>
            </li>
            <li className="text-silver/60">{contact.hours}</li>
          </ul>

          <div className="mt-7 flex flex-col gap-3">
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm w-full">
                WhatsApp
                <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
              </a>
            ) : null}
            <Link href="/contact" className="btn-gold btn-sm w-full">
              Arrange a viewing
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.07]">
        <div className="shell flex flex-col gap-4 py-6 text-[0.68rem] text-silver/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {branding.businessName}. {branding.tagline}.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="transition-colors hover:text-gold">
                {link.label}
              </Link>
            ))}
            {/* Discreet owner entry point — authentication still gates /admin. */}
            <Link
              href="/settings"
              className="uppercase tracking-[0.2em] text-silver/45 transition-colors hover:text-gold"
            >
              Settings
            </Link>
          </div>
        </div>
        <div className="shell pb-6">
          <p className="max-w-3xl text-[0.66rem] leading-relaxed text-silver/35">{settings.website.footerNote}</p>
        </div>
      </div>
    </footer>
  );
}

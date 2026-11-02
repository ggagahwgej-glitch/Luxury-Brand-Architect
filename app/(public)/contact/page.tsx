import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { getRepository, getSiteSettings } from "@/lib/data";
import { PageHero } from "@/components/layout/page-hero";
import { InquiryForm } from "@/components/forms/inquiry-form";
import { Reveal } from "@/components/ui/reveal";
import { telLink, whatsappLink } from "@/lib/format";
import { SITE } from "@/lib/config/site";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: "Contact",
    description: `Contact ${settings.branding.businessName} — private appointments, property enquiries and client services. ${settings.contact.phone}.`,
    alternates: { canonical: "/contact" },
    openGraph: {
      title: `Contact · ${settings.branding.websiteName}`,
      description: settings.seo.description,
      url: `${SITE.url}/contact`,
      images: [{ url: "/seed/commercial-lobby.jpg" }],
    },
  };
}

export default async function ContactPage() {
  const [settings, properties] = await Promise.all([
    getSiteSettings(),
    getRepository().listProperties({ pageSize: 40, availabilityOnly: true, sort: "newest" }),
  ]);

  const wa = whatsappLink(settings.contact.whatsapp, `Hello ${settings.branding.businessName}, I would like to discuss a property requirement.`);
  const tel = telLink(settings.contact.phone);

  const channels = [
    {
      icon: Phone,
      label: "Private office",
      value: settings.contact.phone,
      href: tel,
      note: "Direct line to an advisor",
    },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: settings.contact.whatsapp,
      href: wa,
      note: "Fastest for viewings",
      external: true,
    },
    {
      icon: Mail,
      label: "Email",
      value: settings.contact.email,
      href: `mailto:${settings.contact.email}`,
      note: "Replies within one business day",
    },
    {
      icon: MapPin,
      label: "Office",
      value: settings.contact.address,
      href: `https://www.openstreetmap.org/search?query=${encodeURIComponent(settings.contact.address)}`,
      note: "Visits by appointment",
      external: true,
    },
  ];

  return (
    <>
      <PageHero
        size="sm"
        image="/seed/commercial-lobby.jpg"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
        eyebrow="Private Appointments"
        title={
          <>
            Begin a <span className="italic text-gold-soft">conversation</span>
          </>
        }
        description="Tell us what you are looking for and an advisor will respond personally — usually within one business day."
      />

      <section className="shell grid gap-12 py-14 sm:py-20 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {channels.map((channel, index) => (
              <Reveal key={channel.label} delay={index * 70}>
                <a
                  href={channel.href ?? undefined}
                  target={channel.external ? "_blank" : undefined}
                  rel={channel.external ? "noopener noreferrer" : undefined}
                  className="group flex items-start gap-4 border border-white/[0.08] bg-navy/25 p-5 transition-colors hover:border-gold/30 hover:bg-navy/40"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center border border-gold/25 text-gold">
                    <channel.icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[0.58rem] uppercase tracking-[0.2em] text-silver/50">{channel.label}</span>
                    <span className="mt-1.5 block text-[0.86rem] leading-snug text-ivory group-hover:text-gold-soft">
                      {channel.value}
                    </span>
                    <span className="mt-1 block text-[0.7rem] text-silver/55">{channel.note}</span>
                  </span>
                </a>
              </Reveal>
            ))}
          </div>

          <div className="mt-6 flex items-start gap-3 border border-white/[0.07] bg-imperial/40 p-5">
            <Clock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-gold/70" />
            <div>
              <p className="text-[0.58rem] uppercase tracking-[0.2em] text-silver/50">Office hours</p>
              <p className="mt-1.5 text-[0.84rem] text-ivory/85">{settings.contact.hours}</p>
              <p className="mt-1 text-[0.72rem] text-silver/55">
                For existing clients, your advisor&apos;s direct number is on your engagement letter.
              </p>
            </div>
          </div>

          <div className="mt-6 border border-white/[0.07] p-5">
            <p className="text-[0.58rem] uppercase tracking-[0.2em] text-gold/70">Considering selling or letting?</p>
            <p className="mt-2 text-[0.82rem] leading-relaxed text-silver/75">
              We accept a limited number of new instructions each quarter. Send the address and we will respond with a
              considered appraisal.
            </p>
            <Link href="/about" className="ink-link mt-3 text-[0.62rem]">
              About representation
            </Link>
          </div>
        </div>

        <div className="border border-white/[0.08] bg-gradient-to-b from-navy/40 to-imperial/70 p-5 sm:p-8">
          <InquiryForm
            properties={properties.items.map((property) => ({ id: property.id, title: property.title }))}
            title="Send a private enquiry"
            description="Every enquiry is read by an advisor, not an automated system."
          />
        </div>
      </section>
    </>
  );
}

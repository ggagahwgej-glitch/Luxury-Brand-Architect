import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Gem, Landmark, Scale, ShieldCheck } from "lucide-react";
import { getSiteSettings } from "@/lib/data";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { SITE } from "@/lib/config/site";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: "About the Atelier",
    description:
      "Aurum Estates is a private real estate atelier representing exceptional residences and investment addresses with discretion, documentation discipline and personal advisory.",
    alternates: { canonical: "/about" },
    openGraph: {
      title: `About ${settings.branding.businessName}`,
      description: settings.branding.description,
      url: `${SITE.url}/about`,
      images: [{ url: "/seed/brand-story.jpg" }],
    },
  };
}

const PRINCIPLES = [
  {
    icon: Scale,
    title: "Documentation first",
    body: "Title, approvals and measurements are reviewed before a listing is published. Where a document is pending, we disclose it rather than defer it.",
  },
  {
    icon: ShieldCheck,
    title: "Discretion as default",
    body: "Client identity, requirements and negotiation positions stay private. We do not publish client names or sale prices without written consent.",
  },
  {
    icon: Gem,
    title: "A limited register",
    body: "We would rather represent twelve considered residences than two hundred ordinary ones. Selectivity is the service.",
  },
  {
    icon: Landmark,
    title: "Long-term relationships",
    body: "Most of our instructions arrive through existing clients and their advisors. We are structured to keep it that way.",
  },
];

export default async function AboutPage() {
  const settings = await getSiteSettings();

  return (
    <>
      <PageHero
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "About" }]}
        eyebrow="The Atelier"
        title={
          <>
            A private real estate practice built on <span className="italic text-gold-soft">trust</span>
          </>
        }
        description={settings.branding.description}
      />

      <section className="shell grid gap-14 py-16 sm:py-20 lg:grid-cols-2 lg:gap-20">
        <Reveal className="relative">
          <div className="relative aspect-[4/5] overflow-hidden border border-white/10">
            <Image
              src="/seed/commercial-lobby.jpg"
              alt="Marble and bronze lobby of a private client office"
              fill
              sizes="(min-width: 1024px) 45vw, 92vw"
              className="object-cover"
            />
          </div>
          <div className="absolute -bottom-6 -right-4 hidden border border-gold/25 bg-imperial/95 p-5 sm:block">
            <p className="font-display text-3xl text-gold-soft">Private</p>
            <p className="mt-1 text-[0.58rem] uppercase tracking-[0.2em] text-silver/60">By appointment only</p>
          </div>
        </Reveal>

        <div>
          <Reveal>
            <p className="eyebrow mb-4">Our Philosophy</p>
            <h2 className="text-display-md text-ivory">
              Property is a long conversation, not a <span className="italic text-gold-soft">transaction</span>.
            </h2>
          </Reveal>
          <Reveal delay={100} className="mt-7 space-y-5 text-[0.93rem] leading-relaxed text-silver/85">
            <p>
              Aurum Estates was formed to advise private clients who wanted something the market rarely offers:
              unhurried, informed representation. Our work begins with understanding how a client intends to live or
              invest, and continues well beyond the point of sale.
            </p>
            <p>
              We operate across established addresses in Assam, Meghalaya, West Bengal and coastal India, and act for
              clients based in Delhi, Mumbai, Singapore and London. Every instruction is handled by a named advisor,
              supported by a documentation team.
            </p>
            <p>
              We are deliberately independent. No property is promoted because of a developer relationship; the
              register reflects our judgement, and we decline listings that do not meet it.
            </p>
          </Reveal>
          <Reveal delay={180} className="mt-8 flex flex-wrap gap-3">
            <Link href="/properties" className="btn-gold">
              View the register
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link href="/contact" className="btn-ivory">
              Speak with us
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-navy/20">
        <div className="shell py-16 sm:py-20">
          <SectionHeading
            eyebrow="Principles"
            title={
              <>
                Four commitments that shape every <span className="italic text-gold-soft">introduction</span>
              </>
            }
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {PRINCIPLES.map((principle, index) => (
              <Reveal key={principle.title} delay={index * 80} className="h-full">
                <div className="flex h-full gap-5 border border-white/[0.08] bg-imperial/40 p-6">
                  <span className="grid h-11 w-11 shrink-0 place-items-center border border-gold/25 text-gold">
                    <principle.icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-display text-xl text-ivory">{principle.title}</h3>
                    <p className="mt-2 text-[0.85rem] leading-relaxed text-silver/80">{principle.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="shell grid gap-12 py-16 sm:py-20 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div>
          <p className="eyebrow mb-4">The Practice</p>
          <h2 className="text-display-md text-ivory">
            Advisory, <span className="italic text-gold-soft">end to end</span>
          </h2>
          <p className="mt-5 text-[0.92rem] leading-relaxed text-silver/80">
            Our team combines property advisory, legal coordination and client services. We work with independent
            solicitors, structural engineers and valuers — and we remain accountable for the process.
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-6">
            {[
              { label: "Advisory", value: "Acquisition & disposal" },
              { label: "Tenancy", value: "Leasing & management" },
              { label: "Diligence", value: "Title & approvals" },
              { label: "Clients", value: "Private & institutional" },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-[0.58rem] uppercase tracking-[0.2em] text-silver/50">{item.label}</dt>
                <dd className="mt-1.5 text-[0.85rem] text-ivory/85">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <Reveal className="relative aspect-[5/4] overflow-hidden border border-white/10">
          <Image
            src="/seed/interior-kitchen.jpg"
            alt="Detail of a designer kitchen in a represented residence"
            fill
            sizes="(min-width: 1024px) 50vw, 92vw"
            className="object-cover"
          />
        </Reveal>
      </section>

      <section className="relative overflow-hidden border-t border-white/[0.06]">
        <div className="shell flex flex-col items-center py-16 text-center sm:py-20">
          <p className="eyebrow justify-center">Next step</p>
          <h2 className="mt-5 max-w-2xl text-display-sm text-ivory">
            Begin with a private conversation about what you are looking for.
          </h2>
          <Link href="/contact" className="btn-gold mt-8">
            Arrange a consultation
          </Link>
        </div>
      </section>
    </>
  );
}

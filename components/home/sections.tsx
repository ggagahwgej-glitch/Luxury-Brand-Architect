import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Compass,
  FileCheck2,
  Handshake,
  MessageSquare,
  Quote,
} from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { PropertyCard } from "@/components/property/property-card";
import { COLLECTIONS } from "@/lib/constants";
import { SITE } from "@/lib/config/site";
import type { LocationFacet, Property, SiteSettings, Testimonial, TypeFacet } from "@/lib/types";

/* ── Section 2 · Introduction ────────────────────────────────────────────── */
export function BrandIntroduction({ settings }: { settings: SiteSettings }) {
  return (
    <section id="brand-introduction" className="section relative overflow-hidden">
      <div className="shell grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20">
        <Reveal className="relative">
          <div className="relative aspect-[4/5] w-full overflow-hidden sm:aspect-[5/6]">
            <Image
              src="/seed/interior-living.jpg"
              alt="Interior of a private luxury residence represented by the atelier"
              fill
              sizes="(min-width: 1024px) 45vw, 92vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-imperial/55 via-transparent to-transparent" />
          </div>
          <div className="absolute -bottom-6 -right-4 hidden w-56 border border-gold/25 bg-imperial/95 p-5 backdrop-blur sm:block lg:-right-10">
            <p className="font-display text-4xl text-gold-soft">15</p>
            <p className="mt-1 text-[0.58rem] uppercase leading-relaxed tracking-[0.2em] text-silver/60">
              Years advising private clients
            </p>
          </div>
        </Reveal>

        <div>
          <Reveal>
            <p className="eyebrow mb-5">The Atelier</p>
            <h2 className="text-display-md text-ivory">
              A quiet standard of representation for <span className="italic text-gold-soft">exceptional</span>{" "}
              residences.
            </h2>
          </Reveal>
          <Reveal delay={100} className="mt-7 space-y-5 text-[0.95rem] leading-relaxed text-silver/85">
            <p>{settings.branding.description}</p>
            <p>
              We work with a deliberately limited register. Each residence is inspected, documented and presented
              only once we are satisfied that it meets the standard our clients have come to expect — considered
              architecture, clear title, and a location that will hold its value.
            </p>
          </Reveal>
          <Reveal delay={180} className="mt-9 grid gap-6 border-t border-white/[0.08] pt-7 sm:grid-cols-3">
            {[
              { value: "Private", label: "Client register" },
              { value: "Verified", label: "Title & approvals" },
              { value: "Discreet", label: "Viewings by appointment" },
            ].map((item) => (
              <div key={item.label}>
                <p className="font-display text-xl text-gold-soft">{item.value}</p>
                <p className="mt-1 text-[0.62rem] uppercase tracking-[0.18em] text-silver/55">{item.label}</p>
              </div>
            ))}
          </Reveal>
          <Reveal delay={240} className="mt-9">
            <Link href="/about" className="ink-link">
              Our philosophy
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ── Section 3 · Signature properties ────────────────────────────────────── */
export function SignatureProperties({ properties }: { properties: Property[] }) {
  return (
    <section className="section border-t border-white/[0.06] bg-navy/25">
      <div className="shell">
        <SectionHeading
          eyebrow="Signature Collection"
          title={
            <>
              Residences worthy of <span className="italic text-gold-soft">consideration</span>
            </>
          }
          description="A small selection from the current register — each one inspected, documented and represented directly by our advisors."
          action={
            <Link href="/properties?sort=featured" className="btn-outline">
              View all properties
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          }
        />

        {properties.length ? (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3">
            {properties.map((property, index) => (
              <Reveal key={property.id} delay={index * 90}>
                <PropertyCard property={property} priority={index === 0} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="mt-12 border border-dashed border-white/12 bg-imperial/40 px-6 py-16 text-center">
            <p className="font-display text-2xl text-ivory">The register is currently being prepared.</p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-silver">
              New residences are added as they are verified. Share your requirements and we will contact you as
              soon as a suitable address is available.
            </p>
            <Link href="/contact" className="btn-outline mt-7">
              Register your interest
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Section 4 · Collections ─────────────────────────────────────────────── */
export function CollectionsSection({ facets }: { facets: TypeFacet[] }) {
  const counts = new Map(facets.map((facet) => [facet.propertyType, facet.count]));
  const collectionCount = (types: string[]) => types.reduce((sum, type) => sum + (counts.get(type as never) ?? 0), 0);

  return (
    <section className="section">
      <div className="shell">
        <SectionHeading
          eyebrow="The Collections"
          title={
            <>
              Explore by <span className="italic text-gold-soft">category</span>
            </>
          }
          description="Seven considered categories, each with its own character, documentation standard and advisory team."
          action={
            <Link href="/categories" className="ink-link">
              All collections
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          }
        />

        <div className="mt-12 grid auto-rows-[220px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[240px]">
          {COLLECTIONS.map((collection, index) => (
            <Reveal
              key={collection.slug}
              delay={index * 60}
              className={index === 0 ? "sm:col-span-2 sm:row-span-2" : index === 5 ? "lg:col-span-2" : ""}
            >
              <Link
                href={`/properties?type=${collection.types[0]}`}
                className="group relative flex h-full min-h-[200px] w-full flex-col justify-end overflow-hidden border border-white/[0.08]"
              >
                <Image
                  src={collection.image}
                  alt={collection.title}
                  fill
                  sizes={index === 0 ? "(min-width: 1024px) 45vw, 92vw" : "(min-width: 1024px) 22vw, 92vw"}
                  className="object-cover transition-transform duration-[1400ms] ease-luxe group-hover:scale-[1.06]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-imperial via-imperial/45 to-imperial/10 transition-opacity duration-700 group-hover:from-imperial/95" />
                <div className="relative p-5 sm:p-6">
                  <p className="text-[0.55rem] uppercase tracking-[0.24em] text-gold/80">
                    {collectionCount([...collection.types])} {collectionCount([...collection.types]) === 1 ? "listing" : "listings"}
                  </p>
                  <h3 className="mt-2 flex items-center justify-between gap-3 font-display text-2xl text-ivory">
                    {collection.title}
                    <ArrowUpRight
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0 text-gold/60 transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1"
                    />
                  </h3>
                  <p className="mt-2 max-w-[34ch] text-[0.76rem] leading-relaxed text-silver/80 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                    {collection.description}
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Section 5 · Destinations ────────────────────────────────────────────── */
export function DestinationsSection({ locations }: { locations: LocationFacet[] }) {
  const countFor = (name: string) =>
    locations.filter((facet) => facet.location.toLowerCase().startsWith(name.toLowerCase())).reduce((sum, f) => sum + f.count, 0);

  return (
    <section className="section border-y border-white/[0.06] bg-imperial">
      <div className="shell">
        <SectionHeading
          eyebrow="Destinations"
          title={
            <>
              Addresses in the places that <span className="italic text-gold-soft">endure</span>
            </>
          }
          description="We concentrate on markets we know intimately — where title, infrastructure and long-term demand have been proven."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SITE.destinations.map((destination, index) => {
            const count = countFor(destination.name);
            return (
              <Reveal key={destination.name} delay={index * 80}>
                <Link
                  href={`/properties?location=${encodeURIComponent(destination.name)}`}
                  className="group relative block aspect-[3/4] overflow-hidden border border-white/[0.08]"
                >
                  <Image
                    src={destination.image}
                    alt={`${destination.name}, ${destination.region}`}
                    fill
                    sizes="(min-width: 1024px) 24vw, (min-width: 640px) 46vw, 92vw"
                    className="object-cover transition-transform duration-[1600ms] ease-luxe group-hover:scale-[1.07]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-imperial via-imperial/35 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="text-[0.55rem] uppercase tracking-[0.24em] text-gold/80">{destination.region}</p>
                    <h3 className="mt-1.5 font-display text-2xl text-ivory">{destination.name}</h3>
                    <p className="mt-1 text-[0.68rem] uppercase tracking-[0.16em] text-silver/60">
                      {count} {count === 1 ? "residence" : "residences"}
                    </p>
                    <span className="mt-4 block h-px w-10 bg-gold/50 transition-all duration-500 group-hover:w-20" />
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Section 6 · Why choose us ───────────────────────────────────────────── */
const REASONS = [
  {
    icon: Compass,
    title: "Professional guidance",
    body: "Every enquiry is handled by an advisor who knows the property, the locality and the documentation involved — never a call centre.",
  },
  {
    icon: BadgeCheck,
    title: "Verified information",
    body: "Titles, approvals and measurements are checked before publication. If something cannot be verified, we say so.",
  },
  {
    icon: FileCheck2,
    title: "Transparent paperwork",
    body: "Draft agreements, payment schedules and handover checklists are shared in writing, at every stage.",
  },
  {
    icon: Handshake,
    title: "Curated selection",
    body: "We represent a limited register. Declining a property is as much part of our service as presenting one.",
  },
  {
    icon: MessageSquare,
    title: "Dedicated assistance",
    body: "One point of contact from first viewing to registration — plus support after handover for NRI and overseas clients.",
  },
];

export function WhyUsSection() {
  return (
    <section className="section">
      <div className="shell grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            eyebrow="Why Aurum"
            title={
              <>
                Discretion, discipline and a <span className="italic text-gold-soft">long view</span>
              </>
            }
            description="Luxury is a standard of care, not an adjective. These are the commitments behind every introduction we make."
          />
          <Reveal delay={160} className="mt-9">
            <Link href="/contact" className="btn-gold">
              Speak with an advisor
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>

        <ul className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
          {REASONS.map((reason, index) => (
            <Reveal as="li" key={reason.title} delay={index * 70} className="group flex gap-5 py-7 sm:gap-7">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-gold/25 text-gold transition-colors duration-500 group-hover:border-gold/60 group-hover:bg-gold/5">
                <reason.icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-[0.58rem] tracking-[0.2em] text-silver/40">0{index + 1}</span>
                  <h3 className="font-display text-xl text-ivory">{reason.title}</h3>
                </div>
                <p className="mt-2 max-w-xl text-[0.86rem] leading-relaxed text-silver/80">{reason.body}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── Section 7 · Brand story ─────────────────────────────────────────────── */
export function ExperienceSection() {
  return (
    <section className="relative overflow-hidden border-y border-white/[0.06] bg-navy/20">
      <div className="shell grid items-center gap-14 py-20 sm:py-24 lg:grid-cols-2 lg:gap-20 lg:py-30">
        <div>
          <Reveal>
            <p className="eyebrow mb-5">The Experience</p>
            <h2 className="text-display-md text-ivory">
              From first conversation to the <span className="italic text-gold-soft">keys in hand</span>.
            </h2>
          </Reveal>
          <Reveal delay={100} className="mt-7 space-y-5 text-[0.93rem] leading-relaxed text-silver/85">
            <p>
              We begin with a conversation, not a brochure. What matters is how you intend to live — the light you
              want in the morning, the distance you will accept from family, whether the property must earn its keep.
            </p>
            <p>
              From there we prepare a shortlist, arrange private viewings around your schedule, and stay involved
              through negotiation, due diligence and registration. For overseas buyers, we represent you on the ground
              and report in writing at each milestone.
            </p>
          </Reveal>

          <Reveal delay={180} className="mt-9 space-y-4 border-t border-white/[0.08] pt-7">
            {[
              { step: "01", label: "Consultation & brief" },
              { step: "02", label: "Curated shortlist" },
              { step: "03", label: "Private viewings" },
              { step: "04", label: "Due diligence & handover" },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-4">
                <span className="font-display text-lg text-gold/60">{item.step}</span>
                <span className="h-px flex-1 bg-white/[0.08]" />
                <span className="text-[0.66rem] uppercase tracking-[0.2em] text-silver/70">{item.label}</span>
              </div>
            ))}
          </Reveal>
        </div>

        <Reveal delay={120} className="relative">
          <div className="relative ml-auto aspect-[3/4] w-[86%] overflow-hidden border border-white/10">
            <Image
              src="/seed/heritage-house.jpg"
              alt="Restored heritage residence with colonnaded veranda"
              fill
              sizes="(min-width: 1024px) 40vw, 80vw"
              className="object-cover"
            />
          </div>
          <div className="absolute -bottom-8 left-0 aspect-[4/3] w-[52%] overflow-hidden border border-gold/25 shadow-lift">
            <Image
              src="/seed/interior-kitchen.jpg"
              alt="Designer kitchen interior"
              fill
              sizes="(min-width: 1024px) 22vw, 45vw"
              className="object-cover"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Section 8 · Testimonials ────────────────────────────────────────────── */
export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  if (!testimonials.length) return null;
  const hasDemo = testimonials.some((item) => item.isDemo);

  return (
    <section className="section">
      <div className="shell">
        <SectionHeading
          eyebrow="Client Confidence"
          title={
            <>
              In the words of those we <span className="italic text-gold-soft">represent</span>
            </>
          }
          align="center"
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.slice(0, 3).map((testimonial, index) => (
            <Reveal key={testimonial.id} delay={index * 90} className="h-full">
              <figure className="flex h-full flex-col border border-white/[0.08] bg-navy/25 p-7">
                <Quote aria-hidden="true" className="h-7 w-7 text-gold/40" />
                <blockquote className="mt-5 flex-1 font-display text-[1.15rem] leading-relaxed text-ivory/90">
                  “{testimonial.quote}”
                </blockquote>
                <figcaption className="mt-6 border-t border-white/[0.08] pt-4">
                  <p className="text-[0.7rem] uppercase tracking-[0.18em] text-gold/80">{testimonial.author}</p>
                  {testimonial.role ? <p className="mt-1 text-[0.72rem] text-silver/60">{testimonial.role}</p> : null}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
        {hasDemo ? (
          <p className="mt-6 text-center text-[0.62rem] uppercase tracking-[0.18em] text-silver/35">
            Representative testimonials shown in preview mode only — owner-approved feedback appears here in production.
          </p>
        ) : null}
      </div>
    </section>
  );
}

/* ── Section 9 · Closing call to action ──────────────────────────────────── */
export function ClosingCta({ settings }: { settings: SiteSettings }) {
  return (
    <section className="relative isolate overflow-hidden border-t border-white/[0.06] bg-imperial">
      <Image
        src="/seed/estate-aerial.jpg"
        alt=""
        fill
        sizes="100vw"
        className="pointer-events-none absolute inset-0 -z-20 object-cover opacity-15"
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_80%_at_50%_50%,rgba(16,24,39,0.6),rgba(8,9,13,0.98))]" />
      <div className="shell flex flex-col items-center py-20 text-center sm:py-24 lg:py-30">
        <Reveal>
          <p className="eyebrow justify-center">Private Appointments</p>
          <h2 className="mx-auto mt-6 max-w-3xl text-display-lg text-ivory">
            {settings.website.ctaHeading}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-[0.95rem] leading-relaxed text-silver/80">
            {settings.website.ctaDescription}
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link href="/properties" className="btn-gold">
              Explore Our Properties
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link href="/contact" className="btn-ivory">
              Contact the atelier
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

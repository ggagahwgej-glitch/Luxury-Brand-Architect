import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Bath,
  BedDouble,
  Building2,
  Car,
  Check,
  Compass,
  Layers,
  MapPin,
  Maximize,
  MessageCircle,
  Phone,
  Ruler,
  Share2,
} from "lucide-react";
import { getRepository, getSiteSettings } from "@/lib/data";
import { PageHero } from "@/components/layout/page-hero";
import { PropertyGallery } from "@/components/property/property-gallery";
import { PropertyCard } from "@/components/property/property-card";
import { InquiryForm } from "@/components/forms/inquiry-form";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/badge";
import {
  AREA_UNIT_LABELS,
  INQUIRY_INTENT_LABELS,
  PROPERTY_TYPE_LABELS,
  PURPOSE_LABELS,
} from "@/lib/constants";
import { formatArea, formatCurrency, telLink, whatsappLink } from "@/lib/format";
import { coverImage, galleryImages, imageAlt, priceLabel, priceSuffix, propertyVideo } from "@/lib/presentation";
import { SITE } from "@/lib/config/site";
import { jsonLdSafe, truncate } from "@/lib/utils";
import type { Property } from "@/lib/types";
import { UnavailableNotice } from "@/components/layout/unavailable-notice";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  let property: Property | null = null;
  try {
    property = await getRepository().getPropertyBySlug(slug);
  } catch (error) {
    // A database outage must not turn into a 500 with no metadata.
    console.error("[property] metadata lookup failed:", error instanceof Error ? error.message : error);
    return { title: "Property", robots: { index: false, follow: false } };
  }
  if (!property) {
    // Throwing here (before the response starts streaming) guarantees a real
    // 404 status for missing or unpublished listings, not merely a 404 screen.
    notFound();
  }
  const cover = coverImage(property);
  const description = truncate(property.description.replace(/\s+/g, " "), 158);
  const title = `${property.title}, ${property.location}`;

  return {
    title,
    description,
    alternates: { canonical: `/properties/${property.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `${SITE.url}/properties/${property.slug}`,
      images: cover ? [{ url: cover.url, alt: imageAlt(cover, property) }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description, images: cover ? [cover.url] : undefined },
    robots: property.isPublished ? undefined : { index: false, follow: false },
  };
}

function Fact({ icon: Icon, label, value }: { icon: typeof BedDouble; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-white/[0.07] py-3.5 last:border-b-0">
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-gold/60" />
      <div className="flex flex-1 items-baseline justify-between gap-3">
        <dt className="text-[0.7rem] uppercase tracking-[0.14em] text-silver/55">{label}</dt>
        <dd className="text-right text-[0.82rem] text-ivory/90">{value}</dd>
      </div>
    </div>
  );
}

export default async function PropertyDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const repository = getRepository();

  let property: Property | null = null;
  try {
    property = await repository.getPropertyBySlug(slug);
  } catch (error) {
    console.error("[property] lookup failed:", error instanceof Error ? error.message : error);
    const settings = await getSiteSettings();
    const wa = whatsappLink(
      settings.contact.whatsapp,
      `Hello ${settings.branding.businessName}, I was looking at a residence on your website.`,
    );
    return <UnavailableNotice title="This residence could not be loaded." whatsappHref={wa} />;
  }
  if (!property) notFound();

  const [related, settings] = await Promise.all([
    repository.getRelatedProperties(property, 3),
    getSiteSettings(),
  ]);

  const images = galleryImages(property);
  const cover = coverImage(property);
  const video = propertyVideo(property);
  const waMessage = `Hello ${settings.branding.businessName}, I am interested in ${property.title} (${property.location}). Reference: ${property.slug}.`;
  const wa = whatsappLink(settings.contact.whatsapp, waMessage);
  const tel = telLink(settings.contact.phone);

  const listingLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title,
    description: truncate(property.description.replace(/\s+/g, " "), 400),
    url: `${SITE.url}/properties/${property.slug}`,
    datePosted: property.createdAt,
    image: images.slice(0, 5).map((image) => image.url),
    numberOfRooms: property.bedrooms ?? undefined,
    numberOfBathroomsTotal: property.bathrooms ?? undefined,
    floorSize: property.builtUpArea
      ? { "@type": "QuantitativeValue", value: property.builtUpArea, unitText: property.areaUnit }
      : undefined,
    address: { "@type": "PostalAddress", streetAddress: property.address ?? property.location, addressLocality: property.location },
    offers: {
      "@type": "Offer",
      price: property.price,
      priceCurrency: property.currency,
      availability:
        property.status === "available"
          ? "https://schema.org/InStock"
          : property.status === "sold" || property.status === "rented"
            ? "https://schema.org/SoldOut"
            : "https://schema.org/LimitedAvailability",
    },
  };

  const mapSrc =
    property.latitude !== null && property.longitude !== null
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${property.longitude - 0.02}%2C${property.latitude - 0.015}%2C${property.longitude + 0.02}%2C${property.latitude + 0.015}&layer=mapnik&marker=${property.latitude}%2C${property.longitude}`
      : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(listingLd) }} />

      <PageHero
        size="sm"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Properties", href: "/properties" },
          { label: property.title },
        ]}
        eyebrow={`${PROPERTY_TYPE_LABELS[property.propertyType]} · ${PURPOSE_LABELS[property.purpose]} · Ref ${property.slug.slice(0, 18).toUpperCase()}`}
        title={property.title}
        description={
          <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="inline-flex items-center gap-2">
              <MapPin aria-hidden="true" className="h-4 w-4 text-gold/70" />
              {property.location}
            </span>
            <StatusBadge status={property.status} />
            {property.isFeatured ? (
              <span className="badge border-gold/40 bg-gold/10 text-gold-soft">Signature Listing</span>
            ) : null}
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-display text-3xl text-ivory">
              {priceLabel(property)}
              <span className="ml-2 font-sans text-[0.62rem] uppercase tracking-[0.2em] text-silver/60">
                {priceSuffix(property) || "guide price"}
              </span>
            </span>
          </div>
        }
      />

      <section className="shell py-10 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.65fr_0.85fr] lg:gap-12">
          <div>
            <PropertyGallery images={images} title={property.title} fallbackAlt={property.location} />

            {video ? (
              <figure className="mt-8">
                <figcaption className="mb-3 flex items-center justify-between gap-3">
                  <span className="font-display text-xl text-ivory">Property film</span>
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ink-link text-[0.6rem]"
                  >
                    Open in new tab
                  </a>
                </figcaption>
                <video
                  controls
                  preload="metadata"
                  playsInline
                  poster={cover?.url}
                  className="w-full border border-white/[0.08] bg-charcoal"
                >
                  <source src={video.url} />
                  Your browser does not support embedded video. The film can be opened in a new tab.
                </video>
              </figure>
            ) : null}

            <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-y border-white/[0.07] py-6 sm:grid-cols-4">
              {property.bedrooms !== null ? (
                <div>
                  <p className="font-display text-2xl text-ivory">{property.bedrooms}</p>
                  <p className="mt-1 text-[0.6rem] uppercase tracking-[0.18em] text-silver/55">Bedrooms</p>
                </div>
              ) : null}
              {property.bathrooms !== null ? (
                <div>
                  <p className="font-display text-2xl text-ivory">{property.bathrooms}</p>
                  <p className="mt-1 text-[0.6rem] uppercase tracking-[0.18em] text-silver/55">Bathrooms</p>
                </div>
              ) : null}
              {formatArea(property.builtUpArea, property.areaUnit) ? (
                <div>
                  <p className="font-display text-2xl text-ivory">{property.builtUpArea?.toLocaleString("en-IN")}</p>
                  <p className="mt-1 text-[0.6rem] uppercase tracking-[0.18em] text-silver/55">
                    Built-up {AREA_UNIT_LABELS[property.areaUnit]}
                  </p>
                </div>
              ) : null}
              {formatArea(property.plotArea, property.areaUnit) ? (
                <div>
                  <p className="font-display text-2xl text-ivory">{property.plotArea?.toLocaleString("en-IN")}</p>
                  <p className="mt-1 text-[0.6rem] uppercase tracking-[0.18em] text-silver/55">
                    Plot {AREA_UNIT_LABELS[property.areaUnit]}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-10">
              <h2 className="font-display text-2xl text-ivory sm:text-3xl">The Residence</h2>
              <div className="mt-5 space-y-4 text-[0.93rem] leading-relaxed text-silver/85">
                {property.description.split("\n").filter(Boolean).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>

            {property.amenities.length ? (
              <div className="mt-12">
                <h2 className="font-display text-2xl text-ivory">Amenities</h2>
                <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {property.amenities.map((amenity) => (
                    <li key={amenity} className="flex items-start gap-2.5 text-[0.86rem] text-silver/85">
                      <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-gold/70" />
                      {amenity}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {property.features.length ? (
              <div className="mt-12">
                <h2 className="font-display text-2xl text-ivory">Property Features</h2>
                <div className="mt-5 flex flex-wrap gap-2">
                  {property.features.map((feature) => (
                    <span
                      key={feature}
                      className="border border-white/12 px-3 py-1.5 text-[0.72rem] text-silver/85"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-12">
              <h2 className="font-display text-2xl text-ivory">Location</h2>
              <p className="mt-3 flex items-start gap-2 text-[0.88rem] text-silver/80">
                <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-gold/70" />
                {property.address ?? property.location}
              </p>

              {mapSrc ? (
                <div className="mt-5 overflow-hidden border border-white/[0.08]">
                  <iframe
                    title={`Map showing ${property.title}`}
                    src={mapSrc}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="h-[320px] w-full grayscale-[0.35] contrast-[0.95]"
                  />
                  <div className="flex items-center justify-between gap-3 border-t border-white/[0.08] bg-navy/30 px-4 py-3">
                    <p className="text-[0.62rem] uppercase tracking-[0.16em] text-silver/50">
                      Approximate location shown
                    </p>
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${property.latitude}&mlon=${property.longitude}#map=15/${property.latitude}/${property.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ink-link text-[0.62rem]"
                    >
                      Open map
                      <ArrowRight aria-hidden="true" className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="mt-5 flex items-center justify-between gap-4 border border-dashed border-white/12 bg-navy/20 px-4 py-5">
                  <p className="text-[0.78rem] text-silver/65">
                    Exact coordinates are shared with registered clients on request.
                  </p>
                  <Link href="#enquire" className="ink-link text-[0.62rem]">
                    Request location
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Sticky summary / enquiry rail */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="border border-white/[0.09] bg-gradient-to-b from-navy/60 to-imperial/80 p-5 sm:p-6">
              <p className="text-[0.58rem] uppercase tracking-[0.22em] text-gold/80">
                {PURPOSE_LABELS[property.purpose]}
              </p>
              <p className="mt-2 font-display text-3xl text-ivory">
                {formatCurrency(property.price, property.currency)}
                <span className="ml-1 font-sans text-[0.6rem] uppercase tracking-[0.16em] text-silver/60">
                  {priceSuffix(property)}
                </span>
              </p>

              <dl className="mt-5">
                {property.bedrooms !== null ? (
                  <Fact icon={BedDouble} label="Bedrooms" value={String(property.bedrooms)} />
                ) : null}
                {property.bathrooms !== null ? (
                  <Fact icon={Bath} label="Bathrooms" value={String(property.bathrooms)} />
                ) : null}
                {property.balconies !== null ? (
                  <Fact icon={Car} label="Balconies" value={String(property.balconies)} />
                ) : null}
                {formatArea(property.builtUpArea, property.areaUnit) ? (
                  <Fact icon={Maximize} label="Built-up area" value={formatArea(property.builtUpArea, property.areaUnit)!} />
                ) : null}
                {formatArea(property.carpetArea, property.areaUnit) ? (
                  <Fact icon={Layers} label="Carpet area" value={formatArea(property.carpetArea, property.areaUnit)!} />
                ) : null}
                {formatArea(property.plotArea, property.areaUnit) ? (
                  <Fact icon={Ruler} label="Plot area" value={formatArea(property.plotArea, property.areaUnit)!} />
                ) : null}
                <Fact icon={Building2} label="Category" value={PROPERTY_TYPE_LABELS[property.propertyType]} />
                <Fact icon={Compass} label="Availability" value={property.status.replace("_", " ")} />
              </dl>

              <div className="mt-6 space-y-3">
                <Link href="#enquire" className="btn-gold w-full">
                  <MessageCircle aria-hidden="true" className="h-4 w-4" />
                  Enquire about this residence
                </Link>
                {wa ? (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-ivory w-full">
                    WhatsApp an advisor
                  </a>
                ) : null}
                {tel ? (
                  <a href={tel} className="btn-ghost w-full justify-center border border-white/10">
                    <Phone aria-hidden="true" className="h-3.5 w-3.5" />
                    {settings.contact.phone}
                  </a>
                ) : null}
              </div>

              <div className="mt-6 border-t border-white/[0.08] pt-4">
                <p className="text-[0.62rem] uppercase tracking-[0.16em] text-silver/45">
                  Reference {property.slug.toUpperCase().slice(0, 22)}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-[0.68rem] text-silver/55">
                  <Share2 aria-hidden="true" className="h-3 w-3" />
                  Private viewings by appointment · {settings.contact.hours}
                </p>
              </div>
            </div>

            <div className="mt-6 border border-white/[0.07] bg-navy/20 p-5">
              <p className="text-[0.6rem] uppercase tracking-[0.2em] text-gold/70">Enquiry types</p>
              <ul className="mt-3 space-y-2 text-[0.74rem] text-silver/70">
                {(["information", "callback", "visit", "availability"] as const).map((intent) => (
                  <li key={intent} className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-gold/60" />
                    {INQUIRY_INTENT_LABELS[intent]}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <section id="enquire" className="scroll-mt-24 border-y border-white/[0.07] bg-navy/20">
        <div className="shell grid gap-10 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <p className="eyebrow mb-4">Private Enquiry</p>
            <h2 className="text-display-sm text-ivory">Arrange a viewing of {property.title}</h2>
            <p className="mt-4 max-w-md text-[0.88rem] leading-relaxed text-silver/80">
              Share your details and an advisor will confirm availability, prepare the documentation summary and
              arrange a private viewing at a time that suits you.
            </p>
            <div className="mt-7 space-y-2 text-[0.8rem] text-silver/70">
              <p>{settings.contact.hours}</p>
              <a href={tel ?? `mailto:${settings.contact.email}`} className="block text-ivory transition-colors hover:text-gold">
                {settings.contact.phone}
              </a>
              <a href={`mailto:${settings.contact.email}`} className="block transition-colors hover:text-gold">
                {settings.contact.email}
              </a>
            </div>
          </div>
          <div className="border border-white/[0.08] bg-imperial/60 p-5 sm:p-7">
            <InquiryForm propertyId={property.id} propertyTitle={property.title} compact title="" />
          </div>
        </div>
      </section>

      {related.length ? (
        <section className="shell py-16 sm:py-20">
          <SectionHeading
            eyebrow="You may also consider"
            title={
              <>
                Other residences in the <span className="italic text-gold-soft">register</span>
              </>
            }
            action={
              <Link href="/properties" className="btn-outline">
                View all
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item: Property, index: number) => (
              <PropertyCard key={item.id} property={item} sizes="(min-width: 1024px) 30vw, 92vw" priority={index === 0} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

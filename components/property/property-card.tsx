import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Bath, BedDouble, MapPin, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatArea } from "@/lib/format";
import { PURPOSE_LABELS, PROPERTY_TYPE_LABELS } from "@/lib/constants";
import type { Property } from "@/lib/types";
import { coverImage, imageAlt, priceLabel, priceSuffix, propertyHref } from "@/lib/presentation";

export function PropertyCard({
  property,
  priority = false,
  className,
  sizes = "(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 92vw",
}: {
  property: Property;
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  const cover = coverImage(property);
  const area = formatArea(property.builtUpArea ?? property.plotArea ?? property.carpetArea, property.areaUnit);

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden border border-white/[0.08] bg-navy/25 transition-all duration-700 ease-luxe hover:border-gold/30 hover:bg-navy/40",
        className,
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-charcoal">
        {cover ? (
          <Image
            src={cover.url}
            alt={imageAlt(cover, property)}
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover transition-transform duration-[1400ms] ease-luxe group-hover:scale-[1.05]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-charcoal to-imperial">
            <span className="text-[0.62rem] uppercase tracking-[0.3em] text-silver/50">No imagery yet</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-imperial/95 via-imperial/10 to-imperial/30" />

        <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {property.isFeatured ? (
              <span className="badge border-gold/50 bg-imperial/70 text-gold-soft backdrop-blur">Signature</span>
            ) : null}
            {property.status !== "available" ? (
              <span className="badge border-white/25 bg-imperial/70 text-ivory/90 backdrop-blur">
                {property.status === "under_offer"
                  ? "Under Offer"
                  : property.status === "sold"
                    ? "Sold"
                    : property.status === "rented"
                      ? "Rented"
                      : "Unavailable"}
              </span>
            ) : null}
          </div>
          <span className="badge border-white/15 bg-imperial/60 text-ivory/80 backdrop-blur">
            {PURPOSE_LABELS[property.purpose].replace("For ", "")}
          </span>
        </div>

        <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
          <p className="font-display text-2xl text-ivory">
            {priceLabel(property)}
            <span className="ml-1 font-sans text-[0.62rem] uppercase tracking-[0.18em] text-ivory/60">
              {priceSuffix(property)}
            </span>
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="text-[0.6rem] uppercase tracking-[0.24em] text-gold/80">
          {PROPERTY_TYPE_LABELS[property.propertyType]}
          {property.isDemo ? <span className="ml-2 text-silver/50">· preview</span> : null}
        </p>

        <h3 className="mt-3 font-display text-[1.45rem] leading-snug text-ivory transition-colors duration-500 group-hover:text-gold-soft">
          <Link href={propertyHref(property)} className="outline-offset-4">
            {property.title}
          </Link>
        </h3>

        <p className="mt-2 flex items-center gap-1.5 text-[0.78rem] text-silver">
          <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-gold/70" />
          {property.location}
        </p>

        <dl className="mt-auto grid grid-cols-3 gap-2 pt-6 text-[0.72rem] text-silver/90">
          {property.bedrooms !== null ? (
            <div className="flex items-center gap-1.5">
              <BedDouble aria-hidden="true" className="h-4 w-4 text-silver/50" />
              <dt className="sr-only">Bedrooms</dt>
              <dd>{property.bedrooms} Bed</dd>
            </div>
          ) : null}
          {property.bathrooms !== null ? (
            <div className="flex items-center gap-1.5">
              <Bath aria-hidden="true" className="h-4 w-4 text-silver/50" />
              <dt className="sr-only">Bathrooms</dt>
              <dd>{property.bathrooms} Bath</dd>
            </div>
          ) : null}
          {area ? (
            <div className="flex items-center gap-1.5">
              <Maximize aria-hidden="true" className="h-4 w-4 text-silver/50" />
              <dt className="sr-only">Area</dt>
              <dd className="truncate">{area}</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4">
          <span className="text-[0.66rem] uppercase tracking-[0.22em] text-silver/60 transition-colors group-hover:text-gold">
            View Details
          </span>
          <ArrowUpRight
            aria-hidden="true"
            className="h-4 w-4 text-gold/60 transition-all duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gold"
          />
        </div>
      </div>

      <Link
        href={propertyHref(property)}
        className="absolute inset-0 z-10 rounded-sm focus-visible:outline-offset-4"
        aria-label={`View ${property.title}, ${property.location}`}
      >
        <span className="sr-only">View property</span>
      </Link>
    </article>
  );
}

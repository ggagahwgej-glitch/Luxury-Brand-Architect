import type { Property, PropertyMedia } from "@/lib/types";
import { AREA_UNIT_LABELS, PROPERTY_TYPE_LABELS, PURPOSE_LABELS } from "@/lib/constants";
import { formatArea, formatCurrency } from "@/lib/format";

/** Presentation helpers shared by cards, galleries and detail pages. */

export function coverImage(property: Property): PropertyMedia | null {
  const images = property.media.filter((m) => m.mediaType === "image");
  return images.find((m) => m.isCover) ?? images[0] ?? null;
}

export function galleryImages(property: Property): PropertyMedia[] {
  return property.media.filter((m) => m.mediaType === "image");
}

export function propertyVideo(property: Property): PropertyMedia | null {
  return property.media.find((m) => m.mediaType === "video") ?? null;
}

export function propertyHref(property: Pick<Property, "slug">) {
  return `/properties/${property.slug}`;
}

export function imageAlt(media: PropertyMedia | null, property: Property) {
  return media?.alt?.trim() || `${property.title} — ${property.location}`;
}

export function typeLabel(property: Property) {
  return PROPERTY_TYPE_LABELS[property.propertyType];
}

export function purposeLabel(property: Property) {
  return PURPOSE_LABELS[property.purpose];
}

export function priceLabel(property: Property) {
  const base = formatCurrency(property.price, property.currency);
  return property.purpose === "rent" ? `${base}` : base;
}

export function priceSuffix(property: Property) {
  return property.purpose === "rent" ? " / month" : "";
}

export function primaryArea(property: Property) {
  const value = property.builtUpArea ?? property.plotArea ?? property.carpetArea;
  if (!value) return null;
  const unitSuffix = property.builtUpArea
    ? AREA_UNIT_LABELS[property.areaUnit]
    : property.plotArea
      ? AREA_UNIT_LABELS[property.areaUnit]
      : AREA_UNIT_LABELS[property.areaUnit];
  return formatArea(value, property.areaUnit) ?? `${value} ${unitSuffix}`;
}

export function addressLine(property: Property) {
  return property.address?.trim() || property.location;
}

export function publishedLabel(property: Property) {
  if (!property.isPublished) return "Draft";
  return "Published";
}

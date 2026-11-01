import type {
  AreaUnit,
  Inquiry,
  InquiryIntent,
  InquiryStatus,
  MediaType,
  Property,
  PropertyMedia,
  PropertyStatus,
  PropertyType,
  Purpose,
  SiteSettings,
  Testimonial,
} from "@/lib/types";
import { mergeSiteSettings } from "@/lib/config/site";

export interface PropertyMediaRow {
  id: string;
  property_id: string;
  url: string;
  storage_path: string | null;
  media_type: MediaType;
  sort_order: number;
  is_cover: boolean;
  alt: string | null;
  created_at: string;
}

export interface PropertyRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  property_type: PropertyType;
  purpose: Purpose;
  price: number | string;
  currency: string;
  location: string;
  address: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  balconies: number | null;
  built_up_area: number | string | null;
  carpet_area: number | string | null;
  plot_area: number | string | null;
  area_unit: AreaUnit;
  amenities: string[] | null;
  features: string[] | null;
  status: PropertyStatus;
  is_featured: boolean;
  is_published: boolean;
  latitude: number | string | null;
  longitude: number | string | null;
  created_at: string;
  updated_at: string;
  property_media?: PropertyMediaRow[] | null;
}

export interface InquiryRow {
  id: string;
  property_id: string | null;
  property_title: string | null;
  name: string;
  phone: string;
  email: string;
  message: string;
  intent: InquiryIntent;
  status: InquiryStatus;
  created_at: string;
  updated_at: string;
}

export interface SiteSettingsRow {
  id: number;
  branding: SiteSettings["branding"] | null;
  contact: SiteSettings["contact"] | null;
  social: SiteSettings["social"] | null;
  website: SiteSettings["website"] | null;
  seo: SiteSettings["seo"] | null;
  design: SiteSettings["design"] | null;
  testimonials: Testimonial[] | null;
  updated_at: string;
}

const num = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function toMedia(row: PropertyMediaRow): PropertyMedia {
  return {
    id: row.id,
    propertyId: row.property_id,
    url: row.url,
    storagePath: row.storage_path,
    mediaType: row.media_type,
    sortOrder: row.sort_order,
    isCover: row.is_cover,
    alt: row.alt,
    createdAt: row.created_at,
  };
}

export function toProperty(row: PropertyRow): Property {
  const media = [...(row.property_media ?? [])]
    .sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order)
    .map(toMedia);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    propertyType: row.property_type,
    purpose: row.purpose,
    price: num(row.price) ?? 0,
    currency: row.currency,
    location: row.location,
    address: row.address,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    balconies: row.balconies,
    builtUpArea: num(row.built_up_area),
    carpetArea: num(row.carpet_area),
    plotArea: num(row.plot_area),
    areaUnit: row.area_unit,
    amenities: row.amenities ?? [],
    features: row.features ?? [],
    status: row.status,
    isFeatured: row.is_featured,
    isPublished: row.is_published,
    latitude: num(row.latitude),
    longitude: num(row.longitude),
    isDemo: false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    media,
  };
}

export function toInquiry(row: InquiryRow): Inquiry {
  return {
    id: row.id,
    propertyId: row.property_id,
    propertyTitle: row.property_title,
    name: row.name,
    phone: row.phone,
    email: row.email,
    message: row.message,
    intent: row.intent,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toSiteSettings(row: SiteSettingsRow | null): SiteSettings {
  if (!row) return mergeSiteSettings(null);
  return mergeSiteSettings({
    branding: row.branding ?? undefined,
    contact: row.contact ?? undefined,
    social: row.social ?? undefined,
    website: row.website ?? undefined,
    seo: row.seo ?? undefined,
    design: row.design ?? undefined,
    testimonials: row.testimonials ?? undefined,
    updatedAt: row.updated_at,
  });
}

export function toPropertyRow(input: {
  slug: string;
  title: string;
  description: string;
  propertyType: PropertyType;
  purpose: Purpose;
  price: number;
  currency: string;
  location: string;
  address: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  balconies: number | null;
  builtUpArea: number | null;
  carpetArea: number | null;
  plotArea: number | null;
  areaUnit: AreaUnit;
  amenities: string[];
  features: string[];
  status: PropertyStatus;
  isFeatured: boolean;
  isPublished: boolean;
  latitude: number | null;
  longitude: number | null;
}) {
  return {
    slug: input.slug,
    title: input.title,
    description: input.description,
    property_type: input.propertyType,
    purpose: input.purpose,
    price: input.price,
    currency: input.currency,
    location: input.location,
    address: input.address,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    balconies: input.balconies,
    built_up_area: input.builtUpArea,
    carpet_area: input.carpetArea,
    plot_area: input.plotArea,
    area_unit: input.areaUnit,
    amenities: input.amenities,
    features: input.features,
    status: input.status,
    is_featured: input.isFeatured,
    is_published: input.isPublished,
    latitude: input.latitude,
    longitude: input.longitude,
  };
}

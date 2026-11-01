/**
 * Domain types shared by every layer of the application.
 * The public site, the Owner Studio and both data providers all speak
 * these types — there is no second source of truth.
 */

export const PROPERTY_TYPES = [
  "villa",
  "apartment",
  "penthouse",
  "independent_house",
  "residential_plot",
  "commercial_building",
  "commercial_shop",
  "office",
  "land",
  "farmhouse",
  "other",
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_PURPOSES = ["sale", "rent"] as const;
export type Purpose = (typeof PROPERTY_PURPOSES)[number];

export const PROPERTY_STATUSES = [
  "available",
  "under_offer",
  "sold",
  "rented",
  "unavailable",
] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const AREA_UNITS = ["sqft", "sqm", "sqyd", "acre", "hectare"] as const;
export type AreaUnit = (typeof AREA_UNITS)[number];

export const MEDIA_TYPES = ["image", "video"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const INQUIRY_STATUSES = ["new", "read", "contacted", "resolved"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const INQUIRY_INTENTS = [
  "information",
  "callback",
  "visit",
  "availability",
] as const;
export type InquiryIntent = (typeof INQUIRY_INTENTS)[number];

export const PROPERTY_SORTS = [
  "newest",
  "price_asc",
  "price_desc",
  "area_desc",
  "featured",
] as const;
export type PropertySort = (typeof PROPERTY_SORTS)[number];

export interface PropertyMedia {
  id: string;
  propertyId: string;
  url: string;
  storagePath: string | null;
  mediaType: MediaType;
  sortOrder: number;
  isCover: boolean;
  alt: string | null;
  createdAt: string;
}

export interface MediaInput {
  url: string;
  storagePath: string | null;
  mediaType: MediaType;
  alt?: string | null;
  isCover?: boolean;
}

export interface Property {
  id: string;
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
  /** True only for records created by the development preview provider. */
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  media: PropertyMedia[];
}

export interface PropertyInput {
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
  media: MediaInput[];
}

export interface PropertyQuery {
  q?: string;
  purpose?: Purpose;
  propertyType?: PropertyType;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  minBathrooms?: number;
  minArea?: number;
  maxArea?: number;
  status?: PropertyStatus;
  availabilityOnly?: boolean;
  featured?: boolean;
  sort?: PropertySort;
  page?: number;
  pageSize?: number;
  /** Owner Studio only — includes unpublished drafts. */
  includeUnpublished?: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface LocationFacet {
  location: string;
  count: number;
}

export interface TypeFacet {
  propertyType: PropertyType;
  count: number;
}

export interface Inquiry {
  id: string;
  propertyId: string | null;
  propertyTitle: string | null;
  name: string;
  phone: string;
  email: string;
  message: string;
  intent: InquiryIntent;
  status: InquiryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InquiryInput {
  propertyId?: string | null;
  name: string;
  phone: string;
  email: string;
  message: string;
  intent: InquiryIntent;
}

export interface InquiryQuery {
  q?: string;
  status?: InquiryStatus;
  propertyId?: string;
  page?: number;
  pageSize?: number;
}

export interface BrandingSettings {
  businessName: string;
  websiteName: string;
  tagline: string;
  description: string;
  logoUrl: string | null;
  faviconUrl: string | null;
}

export interface ContactSettings {
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  mapUrl: string | null;
  hours: string;
}

export interface SocialSettings {
  facebook: string;
  instagram: string;
  linkedin: string;
  youtube: string;
}

export interface WebsiteSettings {
  heroHeading: string;
  heroDescription: string;
  heroImageUrl: string | null;
  heroImageAlt: string;
  heroEyebrow: string;
  showCollections: boolean;
  showDestinations: boolean;
  showTestimonials: boolean;
  showExperience: boolean;
  showWhyUs: boolean;
  ctaHeading: string;
  ctaDescription: string;
  footerNote: string;
}

export interface SeoSettings {
  title: string;
  description: string;
  ogImageUrl: string | null;
}

export type AccentPreset = "imperial_gold" | "champagne" | "bronze" | "platinum";
export type DisplayFontPreset = "cormorant" | "playfair";

export interface DesignSettings {
  accent: AccentPreset;
  displayFont: DisplayFontPreset;
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  isDemo: boolean;
}

export interface SiteSettings {
  branding: BrandingSettings;
  contact: ContactSettings;
  social: SocialSettings;
  website: WebsiteSettings;
  seo: SeoSettings;
  design: DesignSettings;
  testimonials: Testimonial[];
  updatedAt: string;
}

export type SiteSettingsPatch = Partial<{
  branding: Partial<BrandingSettings>;
  contact: Partial<ContactSettings>;
  social: Partial<SocialSettings>;
  website: Partial<WebsiteSettings>;
  seo: Partial<SeoSettings>;
  design: Partial<DesignSettings>;
  testimonials: Testimonial[];
}>;

export interface DashboardStats {
  totalProperties: number;
  publishedProperties: number;
  availableProperties: number;
  soldProperties: number;
  rentedProperties: number;
  featuredProperties: number;
  totalInquiries: number;
  unreadInquiries: number;
  mediaCount: number;
  inquiriesLast14Days: { date: string; count: number }[];
}

export interface ActivityEntry {
  id: string;
  kind: "property_created" | "property_updated" | "inquiry_received";
  title: string;
  detail: string;
  at: string;
  href: string | null;
}

export interface MediaLibraryItem extends PropertyMedia {
  propertyTitle: string;
  propertySlug: string;
}

export interface AdminSessionPayload {
  sub: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
  sid: string;
}

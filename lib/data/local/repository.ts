import { readDatabase, withDatabase, type LocalDatabase } from "@/lib/data/local/store";
import type { Repository } from "@/lib/data/repository";
import { mergeSiteSettings } from "@/lib/config/site";
import type {
  ActivityEntry,
  DashboardStats,
  Inquiry,
  InquiryInput,
  InquiryQuery,
  InquiryStatus,
  LocationFacet,
  MediaLibraryItem,
  Paginated,
  Property,
  PropertyInput,
  PropertyQuery,
  Purpose,
  SiteSettings,
  SiteSettingsPatch,
  TypeFacet,
} from "@/lib/types";
import { clamp, slugify, uuid } from "@/lib/utils";

const DEFAULT_PAGE_SIZE = 9;
const MAX_PAGE_SIZE = 48;

function matchesText(property: Property, q: string) {
  const haystack = [
    property.title,
    property.location,
    property.address ?? "",
    property.description,
    property.propertyType.replace(/_/g, " "),
  ]
    .join(" ")
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

function areaOf(property: Property) {
  return property.builtUpArea ?? property.plotArea ?? property.carpetArea ?? 0;
}

function filterProperties(properties: Property[], query: PropertyQuery) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = clamp(query.pageSize ?? DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const statuses: Property["status"][] = query.status
    ? [query.status]
    : query.availabilityOnly === false
      ? []
      : ["available", "under_offer"];

  const filtered = properties.filter((property) => {
    if (!query.includeUnpublished && !property.isPublished) return false;
    if (query.includeUnpublished === false && !property.isPublished) return false;
    if (query.published !== undefined && property.isPublished !== query.published) return false;
    if (statuses.length && !statuses.includes(property.status)) return false;
    if (query.purpose && property.purpose !== query.purpose) return false;
    if (query.propertyType && property.propertyType !== query.propertyType) return false;
    if (query.featured && !property.isFeatured) return false;
    if (query.q && !matchesText(property, query.q)) return false;
    if (query.location && !property.location.toLowerCase().includes(query.location.toLowerCase()))
      return false;
    if (query.minPrice !== undefined && property.price < query.minPrice) return false;
    if (query.maxPrice !== undefined && property.price > query.maxPrice) return false;
    if (query.minBedrooms !== undefined && (property.bedrooms ?? 0) < query.minBedrooms) return false;
    if (query.minBathrooms !== undefined && (property.bathrooms ?? 0) < query.minBathrooms) return false;
    if (query.minArea !== undefined && areaOf(property) < query.minArea) return false;
    if (query.maxArea !== undefined && areaOf(property) > query.maxArea) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (query.sort) {
      case "price_asc":
        return a.price - b.price;
      case "price_desc":
        return b.price - a.price;
      case "area_desc":
        return areaOf(b) - areaOf(a);
      case "featured":
        return (
          Number(b.isFeatured) - Number(a.isFeatured) ||
          Date.parse(b.createdAt) - Date.parse(a.createdAt)
        );
      default:
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    }
  });

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  // A page number beyond the last page must not render an empty "no results"
  // screen when the register does have matches — clamp to the last page.
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    items: sorted.slice(start, start + pageSize).map(clone),
    total,
    page: safePage,
    pageSize,
    pageCount,
  } satisfies Paginated<Property>;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function uniqueSlug(db: LocalDatabase, desired: string, excludeId?: string) {
  const base = slugify(desired) || "property";
  let candidate = base;
  let counter = 2;
  while (db.properties.some((p) => p.slug === candidate && p.id !== excludeId)) {
    candidate = `${base}-${counter++}`;
  }
  return candidate;
}

function applyInput(input: PropertyInput, existing?: Property): Property {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? uuid(),
    slug: input.slug,
    title: input.title,
    description: input.description,
    propertyType: input.propertyType,
    purpose: input.purpose,
    price: input.price,
    currency: input.currency,
    location: input.location,
    address: input.address,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    balconies: input.balconies,
    builtUpArea: input.builtUpArea,
    carpetArea: input.carpetArea,
    plotArea: input.plotArea,
    areaUnit: input.areaUnit,
    amenities: input.amenities,
    features: input.features,
    status: input.status,
    isFeatured: input.isFeatured,
    isPublished: input.isPublished,
    latitude: input.latitude,
    longitude: input.longitude,
    isDemo: existing?.isDemo ?? false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    media: input.media.map((media, index) => {
      const previous = existing?.media.find((m) => m.url === media.url);
      return {
        id: previous?.id ?? uuid(),
        propertyId: existing?.id ?? "",
        url: media.url,
        storagePath: media.storagePath,
        mediaType: media.mediaType,
        sortOrder: index,
        isCover: media.isCover ?? index === 0,
        alt: media.alt ?? null,
        createdAt: previous?.createdAt ?? now,
      };
    }),
  };
}

function normaliseCover(property: Property) {
  const images = property.media.filter((m) => m.mediaType === "image");
  const hasCoverImage = property.media.some((m) => m.isCover && m.mediaType === "image");
  if (!hasCoverImage && images[0]) {
    property.media = property.media.map((m) => ({ ...m, isCover: m.id === images[0]!.id }));
  }
  property.media.sort((a, b) => Number(b.isCover) - Number(a.isCover) || a.sortOrder - b.sortOrder);
  property.media = property.media.map((m, index) => ({ ...m, propertyId: property.id, sortOrder: index }));
}

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export class LocalRepository implements Repository {
  readonly providerName = "local" as const;

  async listProperties(query: PropertyQuery): Promise<Paginated<Property>> {
    const db = await readDatabase();
    return filterProperties(db.properties, query);
  }

  async getPropertyBySlug(slug: string, opts: { includeUnpublished?: boolean } = {}) {
    const db = await readDatabase();
    const property = db.properties.find((p) => p.slug === slug);
    if (!property) return null;
    if (!property.isPublished && !opts.includeUnpublished) return null;
    return clone(property);
  }

  async getPropertyById(id: string) {
    const db = await readDatabase();
    const property = db.properties.find((p) => p.id === id);
    return property ? clone(property) : null;
  }

  async getRelatedProperties(property: Property, limit: number) {
    const db = await readDatabase();
    return db.properties
      .filter(
        (p) =>
          p.id !== property.id &&
          p.isPublished &&
          (p.purpose === property.purpose || p.location === property.location),
      )
      .sort(
        (a, b) =>
          Number(b.location === property.location) - Number(a.location === property.location) ||
          Date.parse(b.createdAt) - Date.parse(a.createdAt),
      )
      .slice(0, limit)
      .map(clone);
  }

  async listFeatured(limit: number) {
    const db = await readDatabase();
    return db.properties
      .filter((p) => p.isPublished && p.isFeatured)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, limit)
      .map(clone);
  }

  async listLocationFacets(): Promise<LocationFacet[]> {
    const db = await readDatabase();
    const counts = new Map<string, number>();
    for (const property of db.properties) {
      if (!property.isPublished) continue;
      if (property.status !== "available" && property.status !== "under_offer") continue;
      counts.set(property.location, (counts.get(property.location) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count || a.location.localeCompare(b.location));
  }

  async listTypeFacets(purpose?: Purpose): Promise<TypeFacet[]> {
    const db = await readDatabase();
    const counts = new Map<Property["propertyType"], number>();
    for (const property of db.properties) {
      if (!property.isPublished) continue;
      if (purpose && property.purpose !== purpose) continue;
      counts.set(property.propertyType, (counts.get(property.propertyType) ?? 0) + 1);
    }
    return [...counts.entries()].map(([propertyType, count]) => ({ propertyType, count }));
  }

  async createProperty(input: PropertyInput) {
    return withDatabase((db) => {
      const slug = uniqueSlug(db, input.slug);
      const property = applyInput({ ...input, slug });
      normaliseCover(property);
      db.properties.unshift(property);
      return clone(property);
    });
  }

  async updateProperty(id: string, input: PropertyInput) {
    return withDatabase((db) => {
      const index = db.properties.findIndex((p) => p.id === id);
      if (index === -1) throw new Error("Property not found");
      const slug = uniqueSlug(db, input.slug, id);
      const property = applyInput({ ...input, slug }, db.properties[index]);
      normaliseCover(property);
      db.properties[index] = property;
      return clone(property);
    });
  }

  async deleteProperty(id: string) {
    await withDatabase((db) => {
      db.properties = db.properties.filter((p) => p.id !== id);
      db.inquiries = db.inquiries.map((inquiry) =>
        inquiry.propertyId === id ? { ...inquiry, propertyId: null, propertyTitle: inquiry.propertyTitle } : inquiry,
      );
    });
  }

  async setPublished(id: string, published: boolean) {
    await withDatabase((db) => {
      const property = db.properties.find((p) => p.id === id);
      if (!property) throw new Error("Property not found");
      property.isPublished = published;
      property.updatedAt = new Date().toISOString();
    });
  }

  async setFeatured(id: string, featured: boolean) {
    await withDatabase((db) => {
      const property = db.properties.find((p) => p.id === id);
      if (!property) throw new Error("Property not found");
      property.isFeatured = featured;
      property.updatedAt = new Date().toISOString();
    });
  }

  async duplicateProperty(id: string) {
    return withDatabase((db) => {
      const source = db.properties.find((p) => p.id === id);
      if (!source) throw new Error("Property not found");
      const copy = clone(source);
      copy.id = uuid();
      copy.title = `${source.title} (Copy)`;
      // Same convention as the Supabase provider: "-copy", then "-copy-2", …
      copy.slug = uniqueSlug(db, `${source.slug}-copy`);
      copy.isPublished = false;
      copy.isFeatured = false;
      copy.createdAt = new Date().toISOString();
      copy.updatedAt = copy.createdAt;
      copy.media = source.media.map((media) => ({
        ...media,
        id: uuid(),
        propertyId: copy.id,
      }));
      db.properties.unshift(copy);
      return clone(copy);
    });
  }

  async slugExists(slug: string, excludeId?: string) {
    const db = await readDatabase();
    return db.properties.some((p) => p.slug === slug && p.id !== excludeId);
  }

  async getStoragePathsForProperty(id: string) {
    const db = await readDatabase();
    const property = db.properties.find((p) => p.id === id);
    return (property?.media ?? []).map((m) => m.storagePath).filter((v): v is string => Boolean(v));
  }

  async findReferencedStoragePaths(paths: string[]): Promise<Set<string>> {
    if (!paths.length) return new Set();
    const db = await readDatabase();
    const wanted = new Set(paths);
    const referenced = new Set<string>();
    for (const property of db.properties) {
      for (const media of property.media) {
        // Duplicated listings share the same stored object, so a path is only
        // safe to delete once no row anywhere points at it.
        if (media.storagePath && wanted.has(media.storagePath)) referenced.add(media.storagePath);
      }
    }
    return referenced;
  }

  async listAllMedia(): Promise<MediaLibraryItem[]> {
    const db = await readDatabase();
    return db.properties.flatMap((property) =>
      property.media.map((media) => ({
        ...media,
        propertyTitle: property.title,
        propertySlug: property.slug,
      })),
    );
  }

  async deleteMedia(mediaId: string) {
    return withDatabase((db) => {
      for (const property of db.properties) {
        const target = property.media.find((m) => m.id === mediaId);
        if (!target) continue;
        property.media = property.media.filter((m) => m.id !== mediaId);
        normaliseCover(property);
        property.updatedAt = new Date().toISOString();
        return { storagePath: target.storagePath };
      }
      return null;
    });
  }

  async createInquiry(input: InquiryInput): Promise<Inquiry> {
    return withDatabase((db) => {
      const property = input.propertyId
        ? db.properties.find((p) => p.id === input.propertyId && p.isPublished)
        : undefined;
      if (input.propertyId && !property) {
        throw new Error("The selected property is no longer available.");
      }
      const now = new Date().toISOString();
      const inquiry: Inquiry = {
        id: uuid(),
        propertyId: property?.id ?? null,
        propertyTitle: property?.title ?? null,
        name: input.name,
        phone: input.phone,
        email: input.email,
        message: input.message,
        intent: input.intent,
        status: "new",
        createdAt: now,
        updatedAt: now,
      };
      db.inquiries.unshift(inquiry);
      return clone(inquiry);
    });
  }

  async listInquiries(query: InquiryQuery): Promise<Paginated<Inquiry>> {
    const db = await readDatabase();
    const page = Math.max(1, query.page ?? 1);
    const pageSize = clamp(query.pageSize ?? 10, 1, 50);
    const filtered = db.inquiries
      .filter((inquiry) => {
        if (query.status && inquiry.status !== query.status) return false;
        if (query.propertyId && inquiry.propertyId !== query.propertyId) return false;
        if (query.q) {
          const haystack = [inquiry.name, inquiry.phone, inquiry.email, inquiry.message, inquiry.propertyTitle ?? ""]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(query.q.toLowerCase())) return false;
        }
        return true;
      })
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    const total = filtered.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, pageCount);
    return {
      items: filtered.slice((safePage - 1) * pageSize, safePage * pageSize).map(clone),
      total,
      page: safePage,
      pageSize,
      pageCount,
    };
  }

  async getInquiry(id: string) {
    const db = await readDatabase();
    const inquiry = db.inquiries.find((i) => i.id === id);
    return inquiry ? clone(inquiry) : null;
  }

  async updateInquiryStatus(id: string, status: InquiryStatus) {
    await withDatabase((db) => {
      const inquiry = db.inquiries.find((i) => i.id === id);
      if (!inquiry) throw new Error("Inquiry not found");
      inquiry.status = status;
      inquiry.updatedAt = new Date().toISOString();
    });
  }

  async deleteInquiry(id: string) {
    await withDatabase((db) => {
      db.inquiries = db.inquiries.filter((i) => i.id !== id);
    });
  }

  async getSiteSettings(): Promise<SiteSettings> {
    const db = await readDatabase();
    return mergeSiteSettings(db.settings);
  }

  async updateSiteSettings(patch: SiteSettingsPatch): Promise<SiteSettings> {
    return withDatabase((db) => {
      const current = mergeSiteSettings(db.settings);
      const next = mergeSiteSettings({
        ...current,
        branding: { ...current.branding, ...patch.branding },
        contact: { ...current.contact, ...patch.contact },
        social: { ...current.social, ...patch.social },
        website: { ...current.website, ...patch.website },
        seo: { ...current.seo, ...patch.seo },
        design: { ...current.design, ...patch.design },
        testimonials: patch.testimonials ?? current.testimonials,
        updatedAt: new Date().toISOString(),
      });
      db.settings = next;
      return clone(next);
    });
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const db = await readDatabase();
    const since = daysAgoIso(14);
    const buckets = new Map<string, number>();
    for (let i = 13; i >= 0; i -= 1) {
      const date = daysAgoIso(i).slice(0, 10);
      buckets.set(date, 0);
    }
    for (const inquiry of db.inquiries) {
      if (inquiry.createdAt < since) continue;
      const key = inquiry.createdAt.slice(0, 10);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return {
      totalProperties: db.properties.length,
      publishedProperties: db.properties.filter((p) => p.isPublished).length,
      availableProperties: db.properties.filter((p) => p.status === "available").length,
      soldProperties: db.properties.filter((p) => p.status === "sold").length,
      rentedProperties: db.properties.filter((p) => p.status === "rented" || p.purpose === "rent").length,
      featuredProperties: db.properties.filter((p) => p.isFeatured).length,
      totalInquiries: db.inquiries.length,
      unreadInquiries: db.inquiries.filter((i) => i.status === "new").length,
      mediaCount: db.properties.reduce((sum, p) => sum + p.media.length, 0),
      inquiriesLast14Days: [...buckets.entries()].map(([date, count]) => ({ date, count })),
    };
  }

  async getRecentActivity(limit: number): Promise<ActivityEntry[]> {
    const db = await readDatabase();
    const entries: ActivityEntry[] = [
      ...db.properties.map((property) => ({
        id: `p-${property.id}`,
        kind: "property_updated" as const,
        title: property.title,
        detail: property.isPublished ? "Listing updated" : "Draft updated",
        at: property.updatedAt,
        href: `/admin/properties/${property.id}/edit`,
      })),
      ...db.inquiries.map((inquiry) => ({
        id: `i-${inquiry.id}`,
        kind: "inquiry_received" as const,
        title: inquiry.name,
        detail: inquiry.propertyTitle ? `Enquiry · ${inquiry.propertyTitle}` : "General enquiry",
        at: inquiry.createdAt,
        href: `/admin/inquiries?focus=${inquiry.id}`,
      })),
    ];
    return entries.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, limit);
  }
}

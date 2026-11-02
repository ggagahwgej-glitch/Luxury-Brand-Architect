import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicClient, getServiceClient } from "@/lib/data/supabase/client";
import {
  toInquiry,
  toProperty,
  toPropertyRow,
  toSiteSettings,
  type InquiryRow,
  type PropertyMediaRow,
  type PropertyRow,
  type SiteSettingsRow,
} from "@/lib/data/supabase/mappers";
import type { Repository } from "@/lib/data/repository";
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
import { clamp, isUuid, slugify } from "@/lib/utils";

const PROPERTY_SELECT = "*, property_media(*)";
const DEFAULT_PAGE_SIZE = 9;
const MAX_PAGE_SIZE = 48;

function escapeSearch(value: string) {
  // Commas separate conditions and quotes delimit values inside PostgREST's
  // `.or()` grammar, so they are stripped before the term is placed in a URL.
  return value.replace(/[%,()*\\"'"]/g, " ").trim();
}

function fail(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? "unknown database error"}`);
}

function applyFilters<
  T extends {
    eq: Function;
    in: Function;
    gte: Function;
    lte: Function;
    or: Function;
    ilike: Function;
  },
>(
  builder: T,
  query: PropertyQuery,
): T {
  const statuses = query.status
    ? [query.status]
    : query.availabilityOnly === false
      ? []
      : ["available", "under_offer"];

  let next = builder;
  if (query.published !== undefined) {
    // Explicit draft/published view (Owner Studio).
    next = next.eq("is_published", query.published) as T;
  } else if (query.includeUnpublished) {
    // service-role reads include drafts; never force the published flag
  } else {
    next = next.eq("is_published", true) as T;
  }
  if (statuses.length) next = next.in("status", statuses) as T;
  if (query.purpose) next = next.eq("purpose", query.purpose) as T;
  if (query.propertyType) next = next.eq("property_type", query.propertyType) as T;
  if (query.featured) next = next.eq("is_featured", true) as T;
  if (query.location) next = next.ilike("location", `%${escapeSearch(query.location)}%`) as T;
  if (query.minPrice !== undefined) next = next.gte("price", query.minPrice) as T;
  if (query.maxPrice !== undefined) next = next.lte("price", query.maxPrice) as T;
  if (query.minBedrooms !== undefined) next = next.gte("bedrooms", query.minBedrooms) as T;
  if (query.minBathrooms !== undefined) next = next.gte("bathrooms", query.minBathrooms) as T;
  // area_display is generated as coalesce(built_up_area, plot_area, carpet_area, 0)
  // in 0001_initial_schema.sql, so min/max area compare the same value the
  // public UI shows instead of only the built-up column.
  if (query.minArea !== undefined) next = next.gte("area_display", query.minArea) as T;
  if (query.maxArea !== undefined) next = next.lte("area_display", query.maxArea) as T;
  if (query.q) {
    const term = escapeSearch(query.q);
    if (term) {
      next = next.or(
        `title.ilike.%${term}%,location.ilike.%${term}%,address.ilike.%${term}%,description.ilike.%${term}%`,
      ) as T;
    }
  }
  return next;
}

function applySort<T extends { order: Function }>(builder: T, sort: PropertyQuery["sort"]): T {
  switch (sort) {
    case "price_asc":
      return builder.order("price", { ascending: true }) as T;
    case "price_desc":
      return builder.order("price", { ascending: false }) as T;
    case "area_desc":
      return builder.order("area_display", { ascending: false, nullsFirst: false }) as T;
    case "featured":
      return builder
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false }) as T;
    default:
      return builder.order("created_at", { ascending: false }) as T;
  }
}

export class SupabaseRepository implements Repository {
  readonly providerName = "supabase" as const;

  private get admin(): SupabaseClient {
    return getServiceClient();
  }

  private get reader(): SupabaseClient {
    return getPublicClient();
  }

  async listProperties(query: PropertyQuery): Promise<Paginated<Property>> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = clamp(query.pageSize ?? DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
    const from = (page - 1) * pageSize;
    const client = query.includeUnpublished ? this.admin : this.reader;

    const run = async (offset: number) => {
      const builder = applySort(
        applyFilters(client.from("properties").select(PROPERTY_SELECT, { count: "exact" }), query),
        query.sort,
      ).range(offset, offset + pageSize - 1);
      const response = await builder;
      if (response.error) fail("Could not load properties", response.error);
      return response;
    };

    const first = await run(from);
    const total = first.count ?? 0;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));

    // Requesting page 99 of a 2-page register must not render "no results".
    if (page > pageCount) {
      const clamped = await run((pageCount - 1) * pageSize);
      return {
        items: ((clamped.data ?? []) as unknown as PropertyRow[]).map(toProperty),
        total: clamped.count ?? total,
        page: pageCount,
        pageSize,
        pageCount,
      };
    }

    return {
      items: ((first.data ?? []) as unknown as PropertyRow[]).map(toProperty),
      total,
      page,
      pageSize,
      pageCount,
    };
  }

  async getPropertyBySlug(slug: string, opts: { includeUnpublished?: boolean } = {}) {
    const client = opts.includeUnpublished ? this.admin : this.reader;
    let builder = client.from("properties").select(PROPERTY_SELECT).eq("slug", slug);
    // RLS already hides drafts from the anon client; the explicit filter keeps
    // the public route fail-closed even if a policy is ever misconfigured.
    if (!opts.includeUnpublished) builder = builder.eq("is_published", true);
    const { data, error } = await builder.maybeSingle();
    if (error) fail("Could not load property", error);
    return data ? toProperty(data as unknown as PropertyRow) : null;
  }

  async getPropertyById(id: string) {
    // `id` can come straight from a URL — never let a malformed value reach a
    // uuid column, which would raise a 500 instead of a clean "not found".
    if (!isUuid(id)) return null;
    const { data, error } = await this.admin
      .from("properties")
      .select(PROPERTY_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) fail("Could not load property", error);
    return data ? toProperty(data as unknown as PropertyRow) : null;
  }

  async getRelatedProperties(property: Property, limit: number) {
    // Two indexed queries instead of `.or("purpose.eq.…,location.eq.…")`:
    // a location such as "Guwahati, Assam" contains a comma, which PostgREST
    // would parse as a filter separator and reject.
    const base = () =>
      this.reader
        .from("properties")
        .select(PROPERTY_SELECT)
        .eq("is_published", true)
        .neq("id", property.id)
        .order("created_at", { ascending: false })
        .limit(limit);

    const [byLocation, byPurpose] = await Promise.all([
      base().eq("location", property.location),
      base().eq("purpose", property.purpose),
    ]);
    if (byLocation.error) fail("Could not load related properties", byLocation.error);
    if (byPurpose.error) fail("Could not load related properties", byPurpose.error);

    const seen = new Set<string>();
    const merged: Property[] = [];
    for (const row of [
      ...((byLocation.data ?? []) as unknown as PropertyRow[]),
      ...((byPurpose.data ?? []) as unknown as PropertyRow[]),
    ]) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      merged.push(toProperty(row));
    }
    return merged.slice(0, limit);
  }

  async listFeatured(limit: number) {
    const { data, error } = await this.reader
      .from("properties")
      .select(PROPERTY_SELECT)
      .eq("is_published", true)
      .eq("is_featured", true)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) fail("Could not load featured properties", error);
    return ((data ?? []) as unknown as PropertyRow[]).map(toProperty);
  }

  async listLocationFacets(): Promise<LocationFacet[]> {
    const { data, error } = await this.reader
      .from("properties")
      .select("location")
      .eq("is_published", true)
      .in("status", ["available", "under_offer"]);
    if (error) fail("Could not load locations", error);
    const counts = new Map<string, number>();
    for (const row of (data ?? []) as { location: string }[]) {
      counts.set(row.location, (counts.get(row.location) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count || a.location.localeCompare(b.location));
  }

  async listTypeFacets(purpose?: Purpose): Promise<TypeFacet[]> {
    let builder = this.reader.from("properties").select("property_type").eq("is_published", true);
    if (purpose) builder = builder.eq("purpose", purpose);
    const { data, error } = await builder;
    if (error) fail("Could not load categories", error);
    const counts = new Map<Property["propertyType"], number>();
    for (const row of (data ?? []) as { property_type: Property["propertyType"] }[]) {
      counts.set(row.property_type, (counts.get(row.property_type) ?? 0) + 1);
    }
    return [...counts.entries()].map(([propertyType, count]) => ({ propertyType, count }));
  }

  async createProperty(input: PropertyInput) {
    const slug = await this.ensureUniqueSlug(input.slug);
    const { data, error } = await this.admin
      .from("properties")
      .insert(toPropertyRow({ ...input, slug }))
      .select("id")
      .single();
    if (error || !data) fail("Could not create property", error);

    const propertyId = (data as { id: string }).id;
    const mediaError = await this.replaceMedia(propertyId, input);
    if (mediaError) {
      // Compensating rollback — never leave a half-created listing behind.
      await this.admin.from("properties").delete().eq("id", propertyId);
      fail("Could not save property media", { message: mediaError });
    }
    const created = await this.getPropertyById(propertyId);
    if (!created) fail("Property was created but could not be reloaded", null);
    return created;
  }

  async updateProperty(id: string, input: PropertyInput) {
    const slug = await this.ensureUniqueSlug(input.slug, id);
    const { error } = await this.admin
      .from("properties")
      .update({ ...toPropertyRow({ ...input, slug }), updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) fail("Could not update property", error);

    const mediaError = await this.replaceMedia(id, input);
    if (mediaError) fail("Property details saved, but media could not be updated", { message: mediaError });

    const updated = await this.getPropertyById(id);
    if (!updated) fail("Property could not be reloaded after update", null);
    return updated;
  }

  /** Inserts new media, updates retained rows, deletes removed rows. */
  private async replaceMedia(propertyId: string, input: PropertyInput): Promise<string | null> {
    const { data: existingRows, error: readError } = await this.admin
      .from("property_media")
      .select("*")
      .eq("property_id", propertyId);
    if (readError) return readError.message;

    const existing = (existingRows ?? []) as PropertyMediaRow[];
    const wanted = input.media;
    const wantedUrls = new Set(wanted.map((m) => m.url));

    // `property_media_single_cover_idx` is a partial unique index on
    // (property_id) where is_cover — moving the cover from A to B in one pass
    // would briefly create two covers, so all covers are cleared first.
    if (existing.some((row) => row.is_cover)) {
      const { error: clearError } = await this.admin
        .from("property_media")
        .update({ is_cover: false })
        .eq("property_id", propertyId)
        .eq("is_cover", true);
      if (clearError) return clearError.message;
      for (const row of existing) row.is_cover = false;
    }

    const removals = existing.filter((row) => !wantedUrls.has(row.url));
    if (removals.length) {
      const { error } = await this.admin
        .from("property_media")
        .delete()
        .in("id", removals.map((row) => row.id));
      if (error) return error.message;
    }

    for (const [index, media] of wanted.entries()) {
      const isCover = media.isCover ?? index === 0;
      const match = existing.find((row) => row.url === media.url);
      const payload = {
        property_id: propertyId,
        url: media.url,
        storage_path: media.storagePath,
        media_type: media.mediaType,
        sort_order: index,
        is_cover: isCover,
        alt: media.alt ?? null,
      };
      const { error } = match
        ? await this.admin.from("property_media").update(payload).eq("id", match.id)
        : await this.admin.from("property_media").insert(payload);
      if (error) return error.message;
    }
    return null;
  }

  async deleteProperty(id: string) {
    // Storage objects are removed by the API route after the row is deleted so
    // that both providers share one cleanup path.
    const { error } = await this.admin.from("properties").delete().eq("id", id);
    if (error) fail("Could not delete property", error);
  }

  async setPublished(id: string, published: boolean) {
    const { error } = await this.admin
      .from("properties")
      .update({ is_published: published, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) fail("Could not update publication status", error);
  }

  async setFeatured(id: string, featured: boolean) {
    const { error } = await this.admin
      .from("properties")
      .update({ is_featured: featured, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) fail("Could not update featured status", error);
  }

  async duplicateProperty(id: string) {
    const source = await this.getPropertyById(id);
    if (!source) fail("Property not found", null);
    const slug = await this.ensureUniqueSlug(`${source.slug}-copy`);
    const { data, error } = await this.admin
      .from("properties")
      .insert(
        toPropertyRow({
          ...source,
          slug,
          title: `${source.title} (Copy)`,
          isPublished: false,
          isFeatured: false,
        }),
      )
      .select("id")
      .single();
    if (error || !data) fail("Could not duplicate property", error);
    const newId = (data as { id: string }).id;
    if (source.media.length) {
      const { error: mediaError } = await this.admin.from("property_media").insert(
        source.media.map((media, index) => ({
          property_id: newId,
          url: media.url,
          storage_path: media.storagePath,
          media_type: media.mediaType,
          sort_order: index,
          is_cover: media.isCover,
          alt: media.alt,
        })),
      );
      if (mediaError) {
        await this.admin.from("properties").delete().eq("id", newId);
        fail("Could not copy property media", mediaError);
      }
    }
    const copy = await this.getPropertyById(newId);
    if (!copy) fail("Duplicated property could not be reloaded", null);
    return copy;
  }

  async slugExists(slug: string, excludeId?: string) {
    let builder = this.admin.from("properties").select("id").eq("slug", slug);
    if (excludeId) builder = builder.neq("id", excludeId);
    const { data, error } = await builder.limit(1);
    if (error) fail("Could not validate slug", error);
    return (data ?? []).length > 0;
  }

  private async ensureUniqueSlug(desired: string, excludeId?: string) {
    const base = slugify(desired) || "property";
    let candidate = base;
    let counter = 2;
    // Bounded loop: give up after 50 attempts with a clear error.
    while (await this.slugExists(candidate, excludeId)) {
      if (counter > 50) throw new Error("Could not generate a unique slug — please change the title.");
      candidate = `${base}-${counter++}`;
    }
    return candidate;
  }

  async getStoragePathsForProperty(id: string) {
    const { data, error } = await this.admin
      .from("property_media")
      .select("storage_path")
      .eq("property_id", id);
    if (error) fail("Could not read property media", error);
    return ((data ?? []) as { storage_path: string | null }[])
      .map((row) => row.storage_path)
      .filter((value): value is string => Boolean(value));
  }

  async findReferencedStoragePaths(paths: string[]): Promise<Set<string>> {
    if (!paths.length) return new Set();
    const { data, error } = await this.admin
      .from("property_media")
      .select("storage_path")
      .in("storage_path", paths);
    if (error) fail("Could not verify stored media references", error);
    return new Set(
      ((data ?? []) as { storage_path: string | null }[])
        .map((row) => row.storage_path)
        .filter((value): value is string => Boolean(value)),
    );
  }

  async listAllMedia(): Promise<MediaLibraryItem[]> {
    const { data, error } = await this.admin
      .from("property_media")
      .select("*, properties!inner(title, slug)")
      .order("created_at", { ascending: false });
    if (error) fail("Could not load media library", error);
    type Row = PropertyMediaRow & { properties: { title: string; slug: string } | null };
    return ((data ?? []) as Row[]).map((row) => ({
      id: row.id,
      propertyId: row.property_id,
      url: row.url,
      storagePath: row.storage_path,
      mediaType: row.media_type,
      sortOrder: row.sort_order,
      isCover: row.is_cover,
      alt: row.alt,
      createdAt: row.created_at,
      propertyTitle: row.properties?.title ?? "Unlinked property",
      propertySlug: row.properties?.slug ?? "",
    }));
  }

  async deleteMedia(mediaId: string) {
    if (!isUuid(mediaId)) return null;
    const { data, error } = await this.admin
      .from("property_media")
      .select("*")
      .eq("id", mediaId)
      .maybeSingle();
    if (error) fail("Could not read media record", error);
    if (!data) return null;
    const row = data as PropertyMediaRow;

    const { error: deleteError } = await this.admin.from("property_media").delete().eq("id", mediaId);
    if (deleteError) fail("Could not delete media", deleteError);

    if (row.is_cover) {
      const { data: remaining } = await this.admin
        .from("property_media")
        .select("id")
        .eq("property_id", row.property_id)
        .eq("media_type", "image")
        .order("sort_order", { ascending: true })
        .limit(1);
      const next = (remaining ?? [])[0] as { id: string } | undefined;
      if (next) await this.admin.from("property_media").update({ is_cover: true }).eq("id", next.id);
    }

    return { storagePath: row.storage_path };
  }

  async createInquiry(input: InquiryInput, meta?: { ipHash?: string | null; userAgent?: string | null }) {
    let propertyTitle: string | null = null;
    if (input.propertyId) {
      const { data, error } = await this.admin
        .from("properties")
        .select("title, is_published")
        .eq("id", input.propertyId)
        .maybeSingle();
      if (error) fail("Could not verify the property", error);
      const record = data as { title: string; is_published: boolean } | null;
      // A public enquiry may only be associated with a live listing — never
      // with a draft, whose title is not public.
      if (!record || !record.is_published) throw new Error("The selected property is no longer available.");
      propertyTitle = record.title;
    }

    const { data, error } = await this.admin
      .from("inquiries")
      .insert({
        property_id: input.propertyId ?? null,
        property_title: propertyTitle,
        name: input.name,
        phone: input.phone,
        email: input.email,
        message: input.message,
        intent: input.intent,
        status: "new",
        ip_hash: meta?.ipHash ?? null,
        user_agent: meta?.userAgent?.slice(0, 300) ?? null,
      })
      .select("*")
      .single();
    if (error || !data) fail("Could not save your enquiry", error);
    return toInquiry(data as unknown as InquiryRow);
  }

  async listInquiries(query: InquiryQuery): Promise<Paginated<Inquiry>> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = clamp(query.pageSize ?? 10, 1, 50);
    const from = (page - 1) * pageSize;
    // postgrest-js builders mutate in place, so every run builds its own query
    // (the pagination clamp below runs twice).
    const build = () => {
      let builder = this.admin.from("inquiries").select("*", { count: "exact" });
      if (query.status) builder = builder.eq("status", query.status);
      if (query.propertyId) builder = builder.eq("property_id", query.propertyId);
      if (query.q) {
        const term = escapeSearch(query.q);
        if (term) {
          builder = builder.or(
            `name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%,message.ilike.%${term}%,property_title.ilike.%${term}%`,
          );
        }
      }
      return builder;
    };
    const run = async (offset: number) => {
      const response = await build()
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (response.error) fail("Could not load inquiries", response.error);
      return response;
    };

    const first = await run(from);
    const total = first.count ?? 0;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));

    if (page > pageCount) {
      const clamped = await run((pageCount - 1) * pageSize);
      return {
        items: ((clamped.data ?? []) as unknown as InquiryRow[]).map(toInquiry),
        total: clamped.count ?? total,
        page: pageCount,
        pageSize,
        pageCount,
      };
    }

    return {
      items: ((first.data ?? []) as unknown as InquiryRow[]).map(toInquiry),
      total,
      page,
      pageSize,
      pageCount,
    };
  }

  async getInquiry(id: string) {
    if (!isUuid(id)) return null;
    const { data, error } = await this.admin.from("inquiries").select("*").eq("id", id).maybeSingle();
    if (error) fail("Could not load inquiry", error);
    return data ? toInquiry(data as unknown as InquiryRow) : null;
  }

  async updateInquiryStatus(id: string, status: InquiryStatus) {
    const { error } = await this.admin
      .from("inquiries")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) fail("Could not update inquiry", error);
  }

  async deleteInquiry(id: string) {
    const { error } = await this.admin.from("inquiries").delete().eq("id", id);
    if (error) fail("Could not delete inquiry", error);
  }

  async getSiteSettings(): Promise<SiteSettings> {
    const { data, error } = await this.admin.from("site_settings").select("*").eq("id", 1).maybeSingle();
    if (error) fail("Could not load site settings", error);
    return toSiteSettings((data as unknown as SiteSettingsRow) ?? null);
  }

  async updateSiteSettings(patch: SiteSettingsPatch): Promise<SiteSettings> {
    const current = await this.getSiteSettings();
    const merged = {
      id: 1,
      branding: { ...current.branding, ...patch.branding },
      contact: { ...current.contact, ...patch.contact },
      social: { ...current.social, ...patch.social },
      website: { ...current.website, ...patch.website },
      seo: { ...current.seo, ...patch.seo },
      design: { ...current.design, ...patch.design },
      testimonials: patch.testimonials ?? current.testimonials,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await this.admin
      .from("site_settings")
      .upsert(merged, { onConflict: "id" })
      .select("*")
      .single();
    if (error || !data) fail("Could not save site settings", error);
    return toSiteSettings(data as unknown as SiteSettingsRow);
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  private async count(table: string, apply?: (builder: any) => any) {
    let builder = this.admin.from(table).select("id", { count: "exact", head: true });
    if (apply) builder = apply(builder);
    const { count, error } = await builder;
    if (error) fail(`Could not count ${table}`, error);
    return count ?? 0;
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  async getDashboardStats(): Promise<DashboardStats> {
    const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
    const [
      totalProperties,
      publishedProperties,
      availableProperties,
      soldProperties,
      rentalProperties,
      featuredProperties,
      totalInquiries,
      unreadInquiries,
      mediaCount,
      recentInquiries,
    ] = await Promise.all([
      this.count("properties"),
      this.count("properties", (b) => b.eq("is_published", true)),
      this.count("properties", (b) => b.eq("status", "available")),
      this.count("properties", (b) => b.eq("status", "sold")),
      this.count("properties", (b) => b.eq("purpose", "rent")),
      this.count("properties", (b) => b.eq("is_featured", true)),
      this.count("inquiries"),
      this.count("inquiries", (b) => b.eq("status", "new")),
      this.count("property_media"),
      this.admin.from("inquiries").select("created_at").gte("created_at", since),
    ]);

    const buckets = new Map<string, number>();
    for (let i = 13; i >= 0; i -= 1) {
      buckets.set(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10), 0);
    }
    if (recentInquiries.error) fail("Could not load inquiry activity", recentInquiries.error);
    for (const row of (recentInquiries.data ?? []) as { created_at: string }[]) {
      const key = row.created_at.slice(0, 10);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }

    return {
      totalProperties,
      publishedProperties,
      availableProperties,
      soldProperties,
      rentedProperties: rentalProperties,
      featuredProperties,
      totalInquiries,
      unreadInquiries,
      mediaCount,
      inquiriesLast14Days: [...buckets.entries()].map(([date, count]) => ({ date, count })),
    };
  }

  async getRecentActivity(limit: number): Promise<ActivityEntry[]> {
    const [propertiesResponse, inquiriesResponse] = await Promise.all([
      this.admin
        .from("properties")
        .select("id, title, is_published, updated_at")
        .order("updated_at", { ascending: false })
        .limit(limit),
      this.admin
        .from("inquiries")
        .select("id, name, property_title, created_at")
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);
    if (propertiesResponse.error) fail("Could not load recent activity", propertiesResponse.error);
    if (inquiriesResponse.error) fail("Could not load recent activity", inquiriesResponse.error);

    const propertyEntries: ActivityEntry[] = (
      (propertiesResponse.data ?? []) as { id: string; title: string; is_published: boolean; updated_at: string }[]
    ).map((row) => ({
      id: `p-${row.id}`,
      kind: "property_updated",
      title: row.title,
      detail: row.is_published ? "Listing updated" : "Draft updated",
      at: row.updated_at,
      href: `/admin/properties/${row.id}/edit`,
    }));

    const inquiryEntries: ActivityEntry[] = (
      (inquiriesResponse.data ?? []) as { id: string; name: string; property_title: string | null; created_at: string }[]
    ).map((row) => ({
      id: `i-${row.id}`,
      kind: "inquiry_received",
      title: row.name,
      detail: row.property_title ? `Enquiry · ${row.property_title}` : "General enquiry",
      at: row.created_at,
      href: `/admin/inquiries?focus=${row.id}`,
    }));

    return [...propertyEntries, ...inquiryEntries]
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
      .slice(0, limit);
  }
}

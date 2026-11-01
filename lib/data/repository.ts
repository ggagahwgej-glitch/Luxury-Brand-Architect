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

/**
 * The single data-access contract for the application.
 * A Supabase project and the local development preview both implement it, so
 * no page or component ever talks to a database driver directly.
 */
export interface Repository {
  /* Properties ---------------------------------------------------------- */
  listProperties(query: PropertyQuery): Promise<Paginated<Property>>;
  getPropertyBySlug(slug: string, opts?: { includeUnpublished?: boolean }): Promise<Property | null>;
  getPropertyById(id: string): Promise<Property | null>;
  getRelatedProperties(property: Property, limit: number): Promise<Property[]>;
  listFeatured(limit: number): Promise<Property[]>;
  listLocationFacets(): Promise<LocationFacet[]>;
  listTypeFacets(purpose?: Purpose): Promise<TypeFacet[]>;
  createProperty(input: PropertyInput): Promise<Property>;
  updateProperty(id: string, input: PropertyInput): Promise<Property>;
  deleteProperty(id: string): Promise<void>;
  setPublished(id: string, published: boolean): Promise<void>;
  setFeatured(id: string, featured: boolean): Promise<void>;
  duplicateProperty(id: string): Promise<Property>;
  slugExists(slug: string, excludeId?: string): Promise<boolean>;
  getStoragePathsForProperty(id: string): Promise<string[]>;
  /**
   * Subset of `paths` still pointed at by any media row. Duplicated listings
   * share stored objects, so a file may only be deleted when nothing else
   * references it.
   */
  findReferencedStoragePaths(paths: string[]): Promise<Set<string>>;

  /* Media --------------------------------------------------------------- */
  listAllMedia(): Promise<MediaLibraryItem[]>;
  deleteMedia(mediaId: string): Promise<{ storagePath: string | null } | null>;

  /* Inquiries ----------------------------------------------------------- */
  createInquiry(input: InquiryInput, meta?: { ipHash?: string | null; userAgent?: string | null }): Promise<Inquiry>;
  listInquiries(query: InquiryQuery): Promise<Paginated<Inquiry>>;
  getInquiry(id: string): Promise<Inquiry | null>;
  updateInquiryStatus(id: string, status: InquiryStatus): Promise<void>;
  deleteInquiry(id: string): Promise<void>;

  /* Settings ------------------------------------------------------------ */
  getSiteSettings(): Promise<SiteSettings>;
  updateSiteSettings(patch: SiteSettingsPatch): Promise<SiteSettings>;

  /* Studio overview ----------------------------------------------------- */
  getDashboardStats(): Promise<DashboardStats>;
  getRecentActivity(limit: number): Promise<ActivityEntry[]>;

  /** Metres of configuration safety — surfaced in the Studio header. */
  readonly providerName: "supabase" | "local";
}

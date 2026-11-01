import {
  PROPERTY_SORTS,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  PROPERTY_PURPOSES,
  type PropertyQuery,
  type PropertySort,
  type PropertyStatus,
  type PropertyType,
  type Purpose,
} from "@/lib/types";

export type RawSearchParams = Record<string, string | string[] | undefined>;

export interface ListingFilters {
  q: string;
  purpose: Purpose | "";
  type: PropertyType | "";
  location: string;
  minPrice: number | null;
  maxPrice: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  minArea: number | null;
  maxArea: number | null;
  status: PropertyStatus | "";
  sort: PropertySort;
  page: number;
}

export const BUDGET_OPTIONS = [
  { label: "Any budget", min: null, max: null },
  { label: "Up to ₹50 L", min: null, max: 5_000_000 },
  { label: "₹50 L – ₹1 Cr", min: 5_000_000, max: 10_000_000 },
  { label: "₹1 Cr – ₹2.5 Cr", min: 10_000_000, max: 25_000_000 },
  { label: "₹2.5 Cr – ₹5 Cr", min: 25_000_000, max: 50_000_000 },
  { label: "₹5 Cr – ₹10 Cr", min: 50_000_000, max: 100_000_000 },
  { label: "Above ₹10 Cr", min: 100_000_000, max: null },
] as const;

export const RENT_BUDGET_OPTIONS = [
  { label: "Any rent", min: null, max: null },
  { label: "Up to ₹50 K", min: null, max: 50_000 },
  { label: "₹50 K – ₹1 L", min: 50_000, max: 100_000 },
  { label: "₹1 L – ₹2 L", min: 100_000, max: 200_000 },
  { label: "₹2 L – ₹5 L", min: 200_000, max: 500_000 },
  { label: "Above ₹5 L", min: 500_000, max: null },
] as const;

function first(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function numeric(value: string | string[] | undefined) {
  const raw = first(value).replace(/,/g, "");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function oneOf<T extends string>(value: string, allowed: readonly T[]): T | "" {
  return (allowed as readonly string[]).includes(value) ? (value as T) : "";
}

export function parseListingParams(params: RawSearchParams, overrides: Partial<ListingFilters> = {}): ListingFilters {
  const sortValue = first(params.sort);
  const pageValue = numeric(params.page);
  const parsed: ListingFilters = {
    q: first(params.q).slice(0, 120),
    purpose: oneOf(first(params.purpose), PROPERTY_PURPOSES),
    type: oneOf(first(params.type), PROPERTY_TYPES),
    location: first(params.location).slice(0, 120),
    minPrice: numeric(params.minPrice),
    maxPrice: numeric(params.maxPrice),
    bedrooms: numeric(params.bedrooms),
    bathrooms: numeric(params.bathrooms),
    minArea: numeric(params.minArea),
    maxArea: numeric(params.maxArea),
    status: oneOf(first(params.status), PROPERTY_STATUSES),
    sort: (PROPERTY_SORTS as readonly string[]).includes(sortValue) ? (sortValue as PropertySort) : "newest",
    page: pageValue && pageValue >= 1 ? Math.floor(pageValue) : 1,
  };
  return { ...parsed, ...overrides };
}

export function filtersToSearchParams(filters: Partial<ListingFilters>) {
  const params = new URLSearchParams();
  const push = (key: string, value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === "") return;
    params.set(key, String(value));
  };
  push("q", filters.q);
  push("purpose", filters.purpose);
  push("type", filters.type);
  push("location", filters.location);
  push("minPrice", filters.minPrice);
  push("maxPrice", filters.maxPrice);
  push("bedrooms", filters.bedrooms);
  push("bathrooms", filters.bathrooms);
  push("minArea", filters.minArea);
  push("maxArea", filters.maxArea);
  push("status", filters.status);
  if (filters.sort && filters.sort !== "newest") push("sort", filters.sort);
  if (filters.page && filters.page > 1) push("page", filters.page);
  return params.toString();
}

export function toPropertyQuery(
  filters: ListingFilters,
  overrides: Partial<PropertyQuery> = {},
): PropertyQuery {
  return {
    q: filters.q || undefined,
    purpose: filters.purpose || undefined,
    propertyType: filters.type || undefined,
    location: filters.location || undefined,
    minPrice: filters.minPrice ?? undefined,
    maxPrice: filters.maxPrice ?? undefined,
    minBedrooms: filters.bedrooms ?? undefined,
    minBathrooms: filters.bathrooms ?? undefined,
    minArea: filters.minArea ?? undefined,
    maxArea: filters.maxArea ?? undefined,
    status: filters.status || undefined,
    sort: filters.sort,
    page: filters.page,
    pageSize: 9,
    availabilityOnly: filters.status ? undefined : true,
    ...overrides,
  };
}

export function activeFilterCount(filters: ListingFilters) {
  let count = 0;
  if (filters.q) count += 1;
  if (filters.purpose) count += 1;
  if (filters.type) count += 1;
  if (filters.location) count += 1;
  if (filters.minPrice !== null || filters.maxPrice !== null) count += 1;
  if (filters.bedrooms !== null) count += 1;
  if (filters.bathrooms !== null) count += 1;
  if (filters.minArea !== null || filters.maxArea !== null) count += 1;
  if (filters.status) count += 1;
  return count;
}

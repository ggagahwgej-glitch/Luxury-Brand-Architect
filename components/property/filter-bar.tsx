"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { PROPERTY_TYPE_LABELS } from "@/lib/constants";
import { AREA_UNIT_LABELS } from "@/lib/constants";
import {
  BUDGET_OPTIONS,
  RENT_BUDGET_OPTIONS,
  activeFilterCount,
  type ListingFilters,
} from "@/lib/search-params";
import type { AreaUnit, LocationFacet, Purpose } from "@/lib/types";
import { cn } from "@/lib/utils";

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[0.55rem] uppercase tracking-[0.24em] text-silver/55">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full cursor-pointer appearance-none border border-white/12 bg-imperial/70 py-2.5 pl-3 pr-9 text-[0.8rem] text-ivory transition-colors hover:border-white/25 focus:border-gold/60 focus:outline-none"
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-silver/50"
        />
      </div>
    </label>
  );
}

export function FilterBar({
  filters,
  locations,
  areaUnit,
  lockedPurpose,
  total,
}: {
  filters: ListingFilters;
  locations: LocationFacet[];
  areaUnit: AreaUnit;
  lockedPurpose?: Purpose;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState(filters.q);

  useEffect(() => setTerm(filters.q), [filters.q]);

  const activeCount = activeFilterCount(filters);
  const budgets = filters.purpose === "rent" ? RENT_BUDGET_OPTIONS : BUDGET_OPTIONS;
  const budgetValue = useMemo(() => {
    const index = budgets.findIndex(
      (option) => option.min === filters.minPrice && option.max === filters.maxPrice,
    );
    return String(index === -1 ? 0 : index);
  }, [budgets, filters.minPrice, filters.maxPrice]);

  function apply(patch: Partial<ListingFilters>) {
    const params = new URLSearchParams(searchParams.toString());
    const setOrDelete = (key: string, value: string | number | null | undefined) => {
      if (value === null || value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    };
    if ("q" in patch) setOrDelete("q", patch.q);
    if ("purpose" in patch) setOrDelete("purpose", lockedPurpose ? lockedPurpose : patch.purpose);
    if ("type" in patch) setOrDelete("type", patch.type);
    if ("location" in patch) setOrDelete("location", patch.location);
    if ("bedrooms" in patch) setOrDelete("bedrooms", patch.bedrooms);
    if ("bathrooms" in patch) setOrDelete("bathrooms", patch.bathrooms);
    if ("minArea" in patch) setOrDelete("minArea", patch.minArea);
    if ("status" in patch) setOrDelete("status", patch.status);
    if ("minPrice" in patch || "maxPrice" in patch) {
      setOrDelete("minPrice", patch.minPrice);
      setOrDelete("maxPrice", patch.maxPrice);
    }
    if ("sort" in patch) setOrDelete("sort", patch.sort && patch.sort !== "newest" ? patch.sort : null);
    params.delete("page");
    startTransition(() => {
      router.replace(`${pathname}${params.size ? `?${params.toString()}` : ""}`, { scroll: false });
    });
  }

  function clearAll() {
    const params = new URLSearchParams();
    if (lockedPurpose) params.set("purpose", lockedPurpose);
    startTransition(() => {
      router.replace(`${pathname}${params.size ? `?${params.toString()}` : ""}`, { scroll: false });
    });
    setOpen(false);
  }

  const chips: { label: string; clear: () => void }[] = [];
  if (filters.q) chips.push({ label: `“${filters.q}”`, clear: () => apply({ q: "" }) });
  if (filters.type)
    chips.push({
      label: PROPERTY_TYPE_LABELS[filters.type],
      clear: () => apply({ type: "" }),
    });
  if (filters.location) chips.push({ label: filters.location, clear: () => apply({ location: "" }) });
  if (filters.bedrooms) chips.push({ label: `${filters.bedrooms}+ bed`, clear: () => apply({ bedrooms: null }) });
  if (filters.bathrooms) chips.push({ label: `${filters.bathrooms}+ bath`, clear: () => apply({ bathrooms: null }) });
  if (filters.minPrice !== null || filters.maxPrice !== null) {
    const option = budgets.find((b) => b.min === filters.minPrice && b.max === filters.maxPrice);
    chips.push({
      label: option?.label ?? "Custom budget",
      clear: () => apply({ minPrice: null, maxPrice: null }),
    });
  }
  if (filters.minArea) chips.push({ label: `${filters.minArea}+ ${AREA_UNIT_LABELS[areaUnit]}`, clear: () => apply({ minArea: null }) });
  if (filters.status) chips.push({ label: filters.status.replace("_", " "), clear: () => apply({ status: "" }) });

  return (
    <div className="sticky top-[68px] z-30 -mx-5 border-y border-white/[0.07] bg-obsidian/95 px-5 py-4 backdrop-blur-xl sm:-mx-8 sm:px-8 lg:static lg:mx-0 lg:border-x-0 lg:border-t-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <p className="text-[0.72rem] uppercase tracking-[0.2em] text-silver/70" aria-live="polite">
            <span className={cn("text-ivory", isPending && "animate-pulse")}>{total}</span>{" "}
            {total === 1 ? "residence" : "residences"}
          </p>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="listing-filters"
            className="flex items-center gap-2 border border-white/15 px-3.5 py-2 text-[0.62rem] uppercase tracking-[0.18em] text-ivory transition-colors hover:border-gold/40 hover:text-gold"
          >
            <SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5" />
            Filters
            {activeCount > 0 ? (
              <span className="grid h-4 min-w-4 place-items-center bg-gold px-1 text-[0.55rem] font-semibold text-imperial">
                {activeCount}
              </span>
            ) : null}
          </button>
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={clearAll}
              className="hidden text-[0.62rem] uppercase tracking-[0.18em] text-silver/55 transition-colors hover:text-gold sm:block"
            >
              Clear all
            </button>
          ) : null}
        </div>

        <label className="flex items-center gap-2.5">
          <span className="text-[0.55rem] uppercase tracking-[0.24em] text-silver/55">Sort</span>
          <div className="relative">
            <select
              value={filters.sort}
              onChange={(event) => apply({ sort: event.target.value as ListingFilters["sort"] })}
              className="cursor-pointer appearance-none border border-white/12 bg-imperial/70 py-2 pl-3 pr-8 text-[0.72rem] text-ivory transition-colors hover:border-white/25 focus:border-gold/60 focus:outline-none"
            >
              <option value="newest">Newest first</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="area_desc">Largest area</option>
              <option value="featured">Signature first</option>
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-silver/50"
            />
          </div>
        </label>
      </div>

      {chips.length ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={chip.clear}
              className="group inline-flex items-center gap-1.5 border border-gold/25 bg-gold/[0.06] px-2.5 py-1 text-[0.64rem] text-gold-soft transition-colors hover:border-gold/50"
            >
              {chip.label}
              <X aria-hidden="true" className="h-3 w-3 opacity-60 group-hover:opacity-100" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="text-[0.62rem] uppercase tracking-[0.16em] text-silver/50 transition-colors hover:text-gold sm:hidden"
          >
            Clear
          </button>
        </div>
      ) : null}

      <div
        id="listing-filters"
        className={cn(
          "grid overflow-hidden transition-all duration-500 ease-luxe lg:!grid-rows-[1fr] lg:!opacity-100",
          open ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 lg:mt-6",
        )}
      >
        <div className="min-h-0">
          <div className="grid gap-4 border border-white/[0.08] bg-navy/40 p-4 sm:p-5 lg:grid-cols-6 lg:items-end">
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.55rem] uppercase tracking-[0.24em] text-silver/55">Keyword</span>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    apply({ q: term.trim() });
                  }}
                  className="relative"
                >
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-silver/50"
                  />
                  <input
                    type="search"
                    value={term}
                    onChange={(event) => setTerm(event.target.value)}
                    placeholder="Title, address, feature…"
                    className="w-full border border-white/12 bg-imperial/70 py-2.5 pl-9 pr-3 text-[0.8rem] text-ivory placeholder:text-silver/40 focus:border-gold/60 focus:outline-none"
                  />
                </form>
              </label>
            </div>

            <Select
              label="Type"
              value={filters.type}
              onChange={(value) => apply({ type: value as ListingFilters["type"] })}
            >
              <option value="">All types</option>
              {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>

            <Select label="Location" value={filters.location} onChange={(value) => apply({ location: value })}>
              <option value="">Any location</option>
              {locations.map((facet) => (
                <option key={facet.location} value={facet.location}>
                  {facet.location} ({facet.count})
                </option>
              ))}
            </Select>

            <Select label="Bedrooms" value={filters.bedrooms ? String(filters.bedrooms) : ""} onChange={(value) => apply({ bedrooms: value ? Number(value) : null })}>
              <option value="">Any</option>
              {[1, 2, 3, 4, 5].map((count) => (
                <option key={count} value={count}>
                  {count}+
                </option>
              ))}
            </Select>

            <Select label="Bathrooms" value={filters.bathrooms ? String(filters.bathrooms) : ""} onChange={(value) => apply({ bathrooms: value ? Number(value) : null })}>
              <option value="">Any</option>
              {[1, 2, 3, 4, 5].map((count) => (
                <option key={count} value={count}>
                  {count}+
                </option>
              ))}
            </Select>

            <Select
              label="Budget"
              value={budgetValue}
              onChange={(value) => {
                const option = budgets[Number(value)] ?? budgets[0];
                apply({ minPrice: option.min, maxPrice: option.max });
              }}
            >
              {budgets.map((option, index) => (
                <option key={option.label} value={String(index)}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select
              label={`Min area (${AREA_UNIT_LABELS[areaUnit]})`}
              value={filters.minArea ? String(filters.minArea) : ""}
              onChange={(value) => apply({ minArea: value ? Number(value) : null })}
            >
              <option value="">Any</option>
              {[500, 1000, 2000, 3000, 5000, 10000].map((value) => (
                <option key={value} value={value}>
                  {value.toLocaleString("en-IN")}+
                </option>
              ))}
            </Select>

            <Select
              label="Availability"
              value={filters.status}
              onChange={(value) => apply({ status: value as ListingFilters["status"] })}
            >
              <option value="">Available only</option>
              <option value="available">Available</option>
              <option value="under_offer">Under offer</option>
              <option value="sold">Sold</option>
              <option value="rented">Rented</option>
              <option value="unavailable">Unavailable</option>
            </Select>

            {!lockedPurpose ? (
              <Select
                label="Purpose"
                value={filters.purpose}
                onChange={(value) => apply({ purpose: value as ListingFilters["purpose"] })}
              >
                <option value="">Buy & rent</option>
                <option value="sale">For sale</option>
                <option value="rent">For rent</option>
              </Select>
            ) : null}

            <div className="flex items-end gap-2">
              <button type="button" onClick={clearAll} className="btn-dark btn-sm w-full">
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

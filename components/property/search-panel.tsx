"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { PROPERTY_TYPE_LABELS } from "@/lib/constants";
import { BUDGET_OPTIONS, RENT_BUDGET_OPTIONS } from "@/lib/search-params";
import type { LocationFacet, Purpose } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Hero search. Every field maps to a real query parameter consumed by the
 * listing page — nothing here is decorative.
 */
export function SearchPanel({
  locations,
  defaultPurpose = "",
  className,
}: {
  locations: LocationFacet[];
  defaultPurpose?: Purpose | "";
  className?: string;
}) {
  const router = useRouter();
  const [purpose, setPurpose] = useState<Purpose | "">(defaultPurpose);
  const [location, setLocation] = useState("");
  const [type, setType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [budgetIndex, setBudgetIndex] = useState("0");
  const [pending, setPending] = useState(false);

  const budgets = purpose === "rent" ? RENT_BUDGET_OPTIONS : BUDGET_OPTIONS;

  const uniqueLocations = useMemo(() => {
    const seen = new Set<string>();
    return locations.filter((facet) => {
      const key = facet.location.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [locations]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const params = new URLSearchParams();
    if (purpose) params.set("purpose", purpose);
    if (location) params.set("location", location);
    if (type) params.set("type", type);
    if (bedrooms) params.set("bedrooms", bedrooms);
    const budget = budgets[Number(budgetIndex)] ?? budgets[0];
    if (budget.min !== null) params.set("minPrice", String(budget.min));
    if (budget.max !== null) params.set("maxPrice", String(budget.max));
    router.push(`/properties${params.size ? `?${params.toString()}` : ""}`);
  }

  return (
    <form
      onSubmit={submit}
      aria-label="Property search"
      className={cn(
        "relative w-full border border-white/12 bg-imperial/85 shadow-[0_40px_80px_-50px_rgba(0,0,0,0.95)] backdrop-blur-xl",
        className,
      )}
    >
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

      <div className="flex flex-col lg:flex-row">
        <div className="flex shrink-0 items-center border-b border-white/[0.08] lg:border-b-0 lg:border-r">
          <fieldset className="flex w-full">
            <legend className="sr-only">Buy or rent</legend>
            {(["sale", "rent"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setPurpose(option);
                  setBudgetIndex("0");
                }}
                aria-pressed={purpose === option}
                className={cn(
                  "flex-1 whitespace-nowrap px-5 py-4 text-[0.66rem] font-semibold uppercase tracking-[0.2em] transition-colors lg:px-6",
                  purpose === option
                    ? "bg-gold/12 text-gold"
                    : "text-silver/70 hover:bg-white/[0.03] hover:text-ivory",
                )}
              >
                {option === "sale" ? "Buy" : "Rent"}
              </button>
            ))}
          </fieldset>
        </div>

        <div className="grid flex-1 grid-cols-1 divide-y divide-white/[0.08] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
          <label className="flex flex-col gap-1 px-5 py-3.5">
            <span className="text-[0.55rem] uppercase tracking-[0.26em] text-gold/70">Location</span>
            <select
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="w-full cursor-pointer appearance-none bg-transparent text-[0.82rem] text-ivory focus:outline-none"
            >
              <option value="">Any location</option>
              {uniqueLocations.map((facet) => (
                <option key={facet.location} value={facet.location}>
                  {facet.location} ({facet.count})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 px-5 py-3.5">
            <span className="text-[0.55rem] uppercase tracking-[0.26em] text-gold/70">Property type</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="w-full cursor-pointer appearance-none bg-transparent text-[0.82rem] text-ivory focus:outline-none"
            >
              <option value="">All types</option>
              {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 px-5 py-3.5">
            <span className="text-[0.55rem] uppercase tracking-[0.26em] text-gold/70">Bedrooms</span>
            <select
              value={bedrooms}
              onChange={(event) => setBedrooms(event.target.value)}
              className="w-full cursor-pointer appearance-none bg-transparent text-[0.82rem] text-ivory focus:outline-none"
            >
              <option value="">Any</option>
              {[1, 2, 3, 4, 5].map((count) => (
                <option key={count} value={count}>
                  {count}+ bedrooms
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 px-5 py-3.5">
            <span className="text-[0.55rem] uppercase tracking-[0.26em] text-gold/70">Budget</span>
            <select
              value={budgetIndex}
              onChange={(event) => setBudgetIndex(event.target.value)}
              className="w-full cursor-pointer appearance-none bg-transparent text-[0.82rem] text-ivory focus:outline-none"
            >
              {budgets.map((budget, index) => (
                <option key={budget.label} value={String(index)}>
                  {budget.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center gap-2 p-3 lg:p-2.5 lg:pl-0">
          <button type="submit" disabled={pending} className="btn-gold w-full lg:w-auto lg:px-8">
            <Search aria-hidden="true" className="h-4 w-4" />
            {pending ? "Searching" : "Search"}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-white/[0.07] px-5 py-2.5">
        <p className="flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.16em] text-silver/50">
          <SlidersHorizontal aria-hidden="true" className="h-3 w-3 text-gold/60" />
          Refine further on the collection page
        </p>
        <button
          type="button"
          onClick={() => {
            setPurpose("");
            setLocation("");
            setType("");
            setBedrooms("");
            setBudgetIndex("0");
          }}
          className="text-[0.62rem] uppercase tracking-[0.16em] text-silver/50 transition-colors hover:text-gold"
        >
          Reset
        </button>
      </div>
    </form>
  );
}

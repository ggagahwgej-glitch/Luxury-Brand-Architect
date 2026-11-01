import Link from "next/link";
import { Suspense } from "react";
import { SearchX } from "lucide-react";
import { PropertyCard } from "@/components/property/property-card";
import { PropertyCardSkeleton } from "@/components/ui/skeleton";
import { FilterBar } from "@/components/property/filter-bar";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { activeFilterCount, filtersToSearchParams, type ListingFilters } from "@/lib/search-params";
import type { AreaUnit, LocationFacet, Paginated, Property, Purpose } from "@/lib/types";

export function PropertyExplorer({
  filters,
  result,
  locations,
  areaUnit,
  basePath,
  lockedPurpose,
  loading = false,
}: {
  filters: ListingFilters;
  result: Paginated<Property>;
  locations: LocationFacet[];
  areaUnit: AreaUnit;
  basePath: string;
  lockedPurpose?: Purpose;
  loading?: boolean;
}) {
  const hrefFor = (page: number) => {
    const query = filtersToSearchParams({ ...filters, page });
    return `${basePath}${query ? `?${query}` : ""}`;
  };

  return (
    <div>
      <Suspense fallback={<div className="h-16 border-y border-white/[0.07]" aria-hidden="true" />}>
        <FilterBar
          filters={filters}
          locations={locations}
          areaUnit={areaUnit}
          lockedPurpose={lockedPurpose}
          total={result.total}
        />
      </Suspense>

      {loading ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <PropertyCardSkeleton key={index} />
          ))}
        </div>
      ) : result.items.length ? (
        <>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {result.items.map((property, index) => (
              <PropertyCard
                key={property.id}
                property={property}
                priority={index < 3}
                sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 92vw"
              />
            ))}
          </div>
          <Pagination page={result.page} pageCount={result.pageCount} hrefFor={hrefFor} />
        </>
      ) : (
        <div className="mt-10">
          <EmptyState
            icon={<SearchX className="h-8 w-8" aria-hidden="true" />}
            title={activeFilterCount(filters) ? "No residences match those criteria" : "The register is being prepared"}
            description={
              activeFilterCount(filters)
                ? "Try widening the budget or location, or speak with an advisor — several residences are available privately before publication."
                : "New residences are added as they are verified. Share your requirements and we will be in touch as soon as a suitable address is available."
            }
            action={
              <div className="flex flex-wrap items-center justify-center gap-3">
                {activeFilterCount(filters) ? (
                  <Link href={basePath} className="btn-outline">
                    Clear filters
                  </Link>
                ) : null}
                <Link href="/contact" className="btn-gold">
                  Register your interest
                </Link>
              </div>
            }
          />
        </div>
      )}
    </div>
  );
}

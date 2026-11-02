import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getRepository, getSiteSettings } from "@/lib/data";
import { PageHero } from "@/components/layout/page-hero";
import { PropertyExplorer } from "@/components/property/property-explorer";
import { filtersToSearchParams, parseListingParams, toPropertyQuery, type RawSearchParams } from "@/lib/search-params";
import { SITE } from "@/lib/config/site";

type PageProps = { searchParams: Promise<RawSearchParams> };

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: "Properties to Rent",
    description:
      "Serviced apartments, private villas and heritage homes available to rent through Aurum Estates. Verified landlords, considered tenancies, discreet handling.",
    alternates: { canonical: "/rent" },
    openGraph: {
      title: `Properties to Rent · ${settings.branding.websiteName}`,
      description: settings.seo.description,
      url: `${SITE.url}/rent`,
      images: [{ url: "/seed/apartment-tower.jpg" }],
    },
  };
}

export default async function RentPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parseListingParams(params, { purpose: "rent" });
  const repository = getRepository();

  const [result, locations] = await Promise.all([
    repository.listProperties(toPropertyQuery(filters, { purpose: "rent" })),
    repository.listLocationFacets(),
  ]);

  // Keep an over-long page number on a real page of results. The locked
  // purpose is implied by the route, so it is not repeated in the URL.
  if (result.total > 0 && filters.page > result.pageCount) {
    const query = filtersToSearchParams({ ...filters, purpose: "", page: result.pageCount });
    redirect(`/rent${query ? `?${query}` : ""}`);
  }

  return (
    <>
      <PageHero
        size="sm"
        image="/seed/penthouse-view.jpg"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Rent" }]}
        eyebrow="Tenancies"
        title={
          <>
            Residences to <span className="italic text-gold-soft">lease</span>
          </>
        }
        description="Furnished and unfurnished homes available on considered tenancies. Monthly rents are shown as quoted by the owner; deposits and terms are confirmed in writing."
      />

      <section className="shell py-10 sm:py-14">
        <PropertyExplorer
          filters={filters}
          result={result}
          locations={locations}
          areaUnit={result.items[0]?.areaUnit ?? "sqft"}
          basePath="/rent"
          lockedPurpose="rent"
        />
      </section>

      <section className="shell grid gap-10 border-t border-white/[0.07] py-16 lg:grid-cols-2 lg:gap-20">
        <div>
          <p className="eyebrow mb-4">Renting with Aurum</p>
          <h2 className="text-display-sm text-ivory">A tenancy that begins with clarity.</h2>
        </div>
        <div className="space-y-4 text-[0.9rem] leading-relaxed text-silver/85">
          <p>
            We work with verified landlords and prepare a written summary of each tenancy — rent, deposit, notice
            period, inclusions and maintenance responsibilities — before you commit.
          </p>
          <p>
            For corporate and NRI tenants we can arrange utilities, staffing and handover oversight, and remain the
            point of contact for the duration of the lease.
          </p>
          <Link href="/contact" className="ink-link mt-2">
            Arrange a private viewing
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </>
  );
}

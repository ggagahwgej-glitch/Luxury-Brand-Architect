import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getRepository, getSiteSettings } from "@/lib/data";
import { emptyPage, safeData } from "@/lib/data/resilient";
import { PageHero } from "@/components/layout/page-hero";
import { PropertyExplorer } from "@/components/property/property-explorer";
import { filtersToSearchParams, parseListingParams, toPropertyQuery, type RawSearchParams } from "@/lib/search-params";
import { SITE } from "@/lib/config/site";

type PageProps = { searchParams: Promise<RawSearchParams> };

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: "Properties for Sale",
    description:
      "Villas, penthouses, estates and investment addresses available to purchase through Aurum Estates. Verified titles, private viewings, discreet representation.",
    alternates: { canonical: "/buy" },
    openGraph: {
      title: `Properties for Sale · ${settings.branding.websiteName}`,
      description: settings.seo.description,
      url: `${SITE.url}/buy`,
      images: [{ url: "/seed/villa-exterior.jpg" }],
    },
  };
}

export default async function BuyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parseListingParams(params, { purpose: "sale" });
  const repository = getRepository();

  const [result, locations] = await Promise.all([
    safeData("sale listings", repository.listProperties(toPropertyQuery(filters, { purpose: "sale" })), emptyPage(9)),
    safeData("locations", repository.listLocationFacets(), []),
  ]);

  // Keep an over-long page number on a real page of results. The locked
  // purpose is implied by the route, so it is not repeated in the URL.
  if (result.total > 0 && filters.page > result.pageCount) {
    const query = filtersToSearchParams({ ...filters, purpose: "", page: result.pageCount });
    redirect(`/buy${query ? `?${query}` : ""}`);
  }

  return (
    <>
      <PageHero
        size="sm"
        image="/seed/villa-exterior.jpg"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Buy" }]}
        eyebrow="Acquisition"
        title={
          <>
            Residences to <span className="italic text-gold-soft">acquire</span>
          </>
        }
        description="A register of freehold residences and investment addresses available for purchase. Sold properties are excluded from these results and appear only when explicitly filtered."
      />

      <section className="shell py-10 sm:py-14">
        <PropertyExplorer
          filters={filters}
          result={result}
          locations={locations}
          areaUnit={result.items[0]?.areaUnit ?? "sqft"}
          basePath="/buy"
          lockedPurpose="sale"
        />
      </section>

      <section className="shell grid gap-10 border-t border-white/[0.07] py-16 lg:grid-cols-2 lg:gap-20">
        <div>
          <p className="eyebrow mb-4">Buying with Aurum</p>
          <h2 className="text-display-sm text-ivory">Due diligence is part of the service, not an afterthought.</h2>
        </div>
        <div className="space-y-4 text-[0.9rem] leading-relaxed text-silver/85">
          <p>
            Every sale begins with a documented brief. We then coordinate structural inspection, title verification,
            encumbrance checks and registration, and represent you through negotiation.
          </p>
          <p>
            For clients purchasing from overseas, we act on your behalf on the ground and provide written reporting at
            each milestone.
          </p>
          <Link href="/contact" className="ink-link mt-2">
            Request an acquisition brief
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </>
  );
}

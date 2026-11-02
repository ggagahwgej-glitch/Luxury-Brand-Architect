import type { Metadata } from "next";
import { getRepository, getSiteSettings } from "@/lib/data";
import { emptyPage, safeData } from "@/lib/data/resilient";
import { PageHero } from "@/components/layout/page-hero";
import { PropertyExplorer } from "@/components/property/property-explorer";
import { parseListingParams, toPropertyQuery, type RawSearchParams } from "@/lib/search-params";
import { PROPERTY_TYPE_LABELS, PURPOSE_LABELS } from "@/lib/constants";
import { SITE } from "@/lib/config/site";

type PageProps = { searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const filters = parseListingParams(await searchParams);
  const settings = await getSiteSettings();
  const pieces: string[] = [];
  pieces.push(filters.type ? PROPERTY_TYPE_LABELS[filters.type] : "Luxury Properties");
  if (filters.purpose) pieces.push(PURPOSE_LABELS[filters.purpose].toLowerCase());
  if (filters.location) pieces.push(`in ${filters.location}`);
  const title = pieces.join(" ");

  const query = new URLSearchParams();
  if (filters.type) query.set("type", filters.type);
  if (filters.purpose) query.set("purpose", filters.purpose);
  if (filters.location) query.set("location", filters.location);

  return {
    title,
    description: settings.seo.description,
    alternates: { canonical: `/properties${query.size ? `?${query.toString()}` : ""}` },
    openGraph: {
      title: `${title} · ${settings.branding.websiteName}`,
      description: settings.seo.description,
      url: `${SITE.url}/properties`,
      images: [{ url: "/seed/villa-exterior.jpg" }],
    },
    robots: filters.page > 1 ? { index: false, follow: true } : undefined,
  };
}

export default async function PropertiesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parseListingParams(params);
  const repository = getRepository();

  const [result, locations] = await Promise.all([
    safeData("property register", repository.listProperties(toPropertyQuery(filters)), emptyPage(9)),
    safeData("locations", repository.listLocationFacets(), []),
  ]);


  const heading = filters.type
    ? `${PROPERTY_TYPE_LABELS[filters.type]}${filters.purpose ? ` ${PURPOSE_LABELS[filters.purpose].toLowerCase()}` : ""}`
    : "The Collection";

  return (
    <>
      <PageHero
        size="sm"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Properties" }]}
        eyebrow="Current Register"
        title={heading}
        description="Browse every residence currently represented. Filter by location, category, budget and availability — all results come directly from the live register."
      />
      <section className="shell py-10 sm:py-14">
        <PropertyExplorer
          filters={filters}
          result={result}
          locations={locations}
          areaUnit={result.items[0]?.areaUnit ?? "sqft"}
          basePath="/properties"
        />
      </section>
    </>
  );
}

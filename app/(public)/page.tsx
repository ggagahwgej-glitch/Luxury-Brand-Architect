import type { Metadata } from "next";
import { getRepository, getSiteSettings } from "@/lib/data";
import { HomeHero } from "@/components/home/hero";
import {
  BrandIntroduction,
  ClosingCta,
  CollectionsSection,
  DestinationsSection,
  ExperienceSection,
  SignatureProperties,
  TestimonialsSection,
  WhyUsSection,
} from "@/components/home/sections";
import { jsonLdSafe } from "@/lib/utils";
import { SITE } from "@/lib/config/site";
import type { Paginated, Property } from "@/lib/types";

// Data-driven page: render on demand so no build-time env or database access
// is required (and the register is never frozen at deploy time).
export const dynamic = "force-dynamic";

const EMPTY_PAGE: Paginated<Property> = { items: [], total: 0, page: 1, pageSize: 3, pageCount: 1 };

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: settings.seo.title,
    description: settings.seo.description,
    alternates: { canonical: "/" },
    openGraph: {
      title: settings.seo.title,
      description: settings.seo.description,
      url: SITE.url,
      images: [{ url: settings.website.heroImageUrl ?? "/seed/hero-residence.jpg" }],
    },
  };
}

export default async function HomePage() {
  const settings = await getSiteSettings();
  const repository = getRepository();

  // A transient database error must degrade to the designed empty states
  // rather than failing the whole homepage.
  const [featured, newest, locations, typeFacets] = await Promise.all([
    repository.listFeatured(3).catch(() => []),
    repository
      .listProperties({ pageSize: 3, sort: "newest", availabilityOnly: true })
      .catch(() => EMPTY_PAGE),
    repository.listLocationFacets().catch(() => []),
    repository.listTypeFacets().catch(() => []),
  ]);

  const signature = featured.length >= 3 ? featured.slice(0, 3) : newest.items.slice(0, 3);
  const heroImage = settings.website.heroImageUrl ?? "/seed/hero-residence.jpg";

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.branding.websiteName,
    url: SITE.url,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE.url}/properties?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(websiteLd) }} />
      <HomeHero settings={settings} locations={locations} heroImage={heroImage} />

      <BrandIntroduction settings={settings} />
      <SignatureProperties properties={signature} />
      {settings.website.showCollections ? <CollectionsSection facets={typeFacets} /> : null}
      {settings.website.showDestinations ? <DestinationsSection locations={locations} /> : null}
      {settings.website.showWhyUs ? <WhyUsSection /> : null}
      {settings.website.showExperience ? <ExperienceSection /> : null}
      {settings.website.showTestimonials ? <TestimonialsSection testimonials={settings.testimonials} /> : null}
      <ClosingCta settings={settings} />
    </>
  );
}

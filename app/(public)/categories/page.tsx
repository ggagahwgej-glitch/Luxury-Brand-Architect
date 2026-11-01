import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getRepository, getSiteSettings } from "@/lib/data";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/ui/reveal";
import { COLLECTIONS } from "@/lib/constants";
import { SITE } from "@/lib/config/site";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: "Property Collections",
    description:
      "Explore Aurum Estates collections — luxury villas, premium apartments, penthouses, independent houses, commercial properties, residential land and private estates.",
    alternates: { canonical: "/categories" },
    openGraph: {
      title: `Property Collections · ${settings.branding.websiteName}`,
      description: settings.seo.description,
      url: `${SITE.url}/categories`,
      images: [{ url: "/seed/heritage-house.jpg" }],
    },
  };
}

export default async function CategoriesPage() {
  const repository = getRepository();
  const facets = await repository.listTypeFacets();
  const counts = new Map(facets.map((facet) => [facet.propertyType, facet.count]));

  return (
    <>
      <PageHero
        size="sm"
        image="/seed/heritage-house.jpg"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Collections" }]}
        eyebrow="The Collections"
        title={
          <>
            Seven categories, one <span className="italic text-gold-soft">standard</span>
          </>
        }
        description="Each collection is represented by advisors who know that category in detail — from title diligence on land parcels to tenancy structuring on serviced apartments."
      />

      <section className="shell py-14 sm:py-20">
        <div className="grid gap-6 sm:grid-cols-2">
          {COLLECTIONS.map((collection, index) => {
            const count = collection.types.reduce((sum, type) => sum + (counts.get(type) ?? 0), 0);
            return (
              <Reveal key={collection.slug} delay={index * 70}>
                <Link
                  href={`/properties?type=${collection.types[0]}`}
                  className="group relative flex h-[320px] flex-col justify-end overflow-hidden border border-white/[0.08] sm:h-[380px]"
                >
                  <Image
                    src={collection.image}
                    alt={collection.title}
                    fill
                    sizes="(min-width: 640px) 46vw, 92vw"
                    className="object-cover transition-transform duration-[1500ms] ease-luxe group-hover:scale-[1.05]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-imperial via-imperial/55 to-imperial/10" />
                  <div className="relative p-6 sm:p-8">
                    <p className="text-[0.58rem] uppercase tracking-[0.24em] text-gold/85">
                      {count} {count === 1 ? "residence" : "residences"}
                    </p>
                    <h2 className="mt-2 flex items-center justify-between gap-4 font-display text-3xl text-ivory">
                      {collection.title}
                      <ArrowUpRight
                        aria-hidden="true"
                        className="h-6 w-6 shrink-0 text-gold/70 transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1"
                      />
                    </h2>
                    <p className="mt-3 max-w-md text-[0.85rem] leading-relaxed text-silver/85">
                      {collection.description}
                    </p>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>

        <div className="mt-14 flex flex-col items-center gap-5 border border-white/[0.08] bg-navy/25 px-6 py-12 text-center">
          <p className="eyebrow justify-center">Private Register</p>
          <h2 className="max-w-2xl text-display-sm text-ivory">
            Some residences are never published. Tell us what you are looking for.
          </h2>
          <p className="max-w-xl text-[0.88rem] leading-relaxed text-silver/75">
            We hold a private register of properties available before launch, including off-market estates and
            tenancies. A short conversation is usually enough to identify whether one suits you.
          </p>
          <Link href="/contact" className="btn-gold mt-2">
            Arrange a consultation
          </Link>
        </div>
      </section>
    </>
  );
}

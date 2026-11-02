import type { MetadataRoute } from "next";
import { getRepository } from "@/lib/data";
import { SITE } from "@/lib/config/site";

// Listings and settings change from the admin studio, so the sitemap is
// rendered on demand instead of being cached for an hour.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/properties`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE.url}/buy`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE.url}/rent`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE.url}/categories`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE.url}/about`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${SITE.url}/contact`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${SITE.url}/settings`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE.url}/legal/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE.url}/legal/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const repository = getRepository();
    const properties: MetadataRoute.Sitemap = [];
    for (let page = 1; page <= 5; page += 1) {
      const result = await repository.listProperties({ page, pageSize: 48, availabilityOnly: false });
      for (const property of result.items) {
        if (!property.isPublished) continue;
        properties.push({
          url: `${SITE.url}/properties/${property.slug}`,
          lastModified: new Date(property.updatedAt),
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
      if (page >= result.pageCount) break;
    }
    return [...staticRoutes, ...properties];
  } catch (error) {
    console.error("[sitemap] property entries unavailable:", error);
    return staticRoutes;
  }
}

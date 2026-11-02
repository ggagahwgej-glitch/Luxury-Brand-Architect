import type { MetadataRoute } from "next";
import { SITE } from "@/lib/config/site";

// Generated per request so the host/sitemap URL always come from the runtime
// environment (a static robots.txt would bake whatever was set at build time).
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The Owner Studio and every API endpoint are private.
        disallow: ["/admin", "/admin/", "/api/"],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}

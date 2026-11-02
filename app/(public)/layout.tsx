import { getSiteSettings } from "@/lib/data";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { PageTransition } from "@/components/layout/page-transition";

/**
 * Every public page reads site settings, and most read listings, from the
 * database. Rendering the whole segment per request means `next build` never
 * needs runtime env vars or a reachable database to prerender a page — a
 * missing/incorrect provider config therefore fails at request time with a
 * clear error instead of breaking the build. Studio edits also appear
 * immediately (the API routes already call revalidatePath).
 */
export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();

  return (
    <>
      <SiteHeader
        businessName={settings.branding.businessName}
        tagline={settings.branding.tagline}
        logoUrl={settings.branding.logoUrl}
        phone={settings.contact.phone}
        hours={settings.contact.hours}
      />
      <main id="main-content" className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}

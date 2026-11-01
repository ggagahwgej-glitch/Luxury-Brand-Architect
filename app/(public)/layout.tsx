import { getSiteSettings } from "@/lib/data";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { PageTransition } from "@/components/layout/page-transition";

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

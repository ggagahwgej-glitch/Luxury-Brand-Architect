import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSiteSettings } from "@/lib/data";
import { ACCENT_PRESETS, DISPLAY_FONT_PRESETS } from "@/lib/constants";
import { SITE } from "@/lib/config/site";
import { PreviewBadge } from "@/components/layout/preview-badge";
import { jsonLdSafe } from "@/lib/utils";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#08090D",
  colorScheme: "dark",
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = settings.seo.title || settings.branding.websiteName;
  const description = settings.seo.description || settings.branding.description;
  const ogImage = settings.seo.ogImageUrl || settings.website.heroImageUrl || "/seed/hero-residence.jpg";

  return {
    metadataBase: new URL(SITE.url),
    title: {
      default: title,
      template: `%s · ${settings.branding.websiteName}`,
    },
    description,
    applicationName: settings.branding.websiteName,
    keywords: [
      "luxury real estate",
      "premium villas",
      "penthouses",
      "private estates",
      settings.branding.businessName,
      "Guwahati luxury property",
      "Assam real estate",
    ],
    authors: [{ name: settings.branding.businessName }],
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: SITE.locale,
      url: SITE.url,
      siteName: settings.branding.websiteName,
      title,
      description,
      images: [{ url: ogImage, width: 1264, height: 848, alt: settings.website.heroImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    icons: settings.branding.faviconUrl
      ? { icon: settings.branding.faviconUrl }
      : { icon: [{ url: "/icon.svg", type: "image/svg+xml" }] },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    formatDetection: { telephone: false },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  const accent = ACCENT_PRESETS[settings.design.accent] ?? ACCENT_PRESETS.imperial_gold;
  const displayFont = DISPLAY_FONT_PRESETS[settings.design.displayFont] ?? DISPLAY_FONT_PRESETS.cormorant;

  const themeStyle = {
    "--accent": accent.accent,
    "--accent-soft": accent.soft,
    "--accent-deep": accent.deep,
    "--font-display": displayFont.stack,
  } as React.CSSProperties;

  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: settings.branding.businessName,
    description: settings.branding.description,
    url: SITE.url,
    telephone: settings.contact.phone,
    email: settings.contact.email,
    address: { "@type": "PostalAddress", streetAddress: settings.contact.address },
    sameAs: [settings.social.facebook, settings.social.instagram, settings.social.linkedin].filter(Boolean),
  };

  return (
    <html lang={SITE.language} style={themeStyle} suppressHydrationWarning>
      <head>
        <script
          // Enables scroll-reveal only when JS is available (content stays
          // readable for crawlers and no-JS visitors).
          dangerouslySetInnerHTML={{
            __html:
              "document.documentElement.classList.add('js');try{if(localStorage.getItem('aurum:reduce-motion')==='true'){document.documentElement.dataset.reduceMotion='true';}}catch(e){}",
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdSafe(organizationLd) }}
        />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-gold focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:uppercase focus:tracking-widest focus:text-imperial"
        >
          Skip to content
        </a>
        {children}
        <PreviewBadge />
      </body>
    </html>
  );
}

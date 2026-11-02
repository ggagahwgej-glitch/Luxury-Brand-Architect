import type { SiteSettings } from "@/lib/types";
import { SITE_TIME_ZONE } from "@/lib/constants";
import { publicSiteUrl } from "@/lib/env";

/**
 * CLIENT BRAND CONFIGURATION
 * ------------------------------------------------------------------
 * Every deployment can be re-branded here + from the Owner Studio
 * (which persists to Supabase). Nothing brand-specific is hardcoded
 * inside components.
 */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  branding: {
    businessName: "Aurum Estates",
    websiteName: "Aurum Estates",
    tagline: "Private Real Estate Atelier",
    description:
      "Aurum Estates represents a considered collection of private residences, estates and investment addresses across India's most established locations. Every property is verified, every introduction is personal.",
    logoUrl: null,
    faviconUrl: null,
  },
  contact: {
    phone: "+91 98640 21000",
    whatsapp: "+91 98640 21000",
    email: "private@aurumestates.com",
    address: "Level 9, Aurum House, G.S. Road, Guwahati 781005, Assam, India",
    mapUrl: null,
    hours: "Mon – Sat · 9:30 to 19:00 IST",
  },
  social: {
    facebook: "https://facebook.com/aurumestates",
    instagram: "https://instagram.com/aurumestates",
    linkedin: "https://linkedin.com/company/aurumestates",
    youtube: "",
  },
  website: {
    heroHeading: "Where Exceptional Living Meets Timeless Elegance.",
    heroDescription:
      "Explore exceptional residences, prestigious addresses and remarkable investment opportunities — represented with discretion, precision and an uncompromising standard of service.",
    heroImageUrl: null,
    heroImageAlt: "Contemporary luxury residence at dusk with reflecting pool and warm interior lighting",
    heroEyebrow: "Est. 2009 · Private Client Representation",
    showCollections: true,
    showDestinations: true,
    showTestimonials: true,
    showExperience: true,
    showWhyUs: true,
    ctaHeading: "Your Next Extraordinary Address Awaits.",
    ctaDescription:
      "Share your requirements and a private advisor will prepare a curated shortlist within one business day.",
    footerNote:
      "Aurum Estates is an independent real estate advisory. Property details are supplied by owners and verified before publication.",
  },
  seo: {
    title: "Aurum Estates — Luxury Real Estate & Private Residences",
    description:
      "Discover exceptional villas, penthouses, estates and investment addresses with Aurum Estates — a private real estate atelier advising discerning buyers and tenants.",
    ogImageUrl: null,
  },
  design: {
    accent: "imperial_gold",
    displayFont: "cormorant",
  },
  testimonials: [],
  updatedAt: new Date(0).toISOString(),
};

export const SITE = {
  url: publicSiteUrl,
  locale: "en_IN",
  language: "en",
  /** Business timezone (shared with lib/format via SITE_TIME_ZONE). */
  timeZone: SITE_TIME_ZONE,
  /** Curated destinations shown on the homepage (managed from settings in future revisions). */
  destinations: [
    { name: "Guwahati", region: "Assam", image: "/seed/estate-aerial.jpg", blurb: "Riverfront residences and green hillside estates." },
    { name: "Shillong", region: "Meghalaya", image: "/seed/heritage-house.jpg", blurb: "Colonial-era character with modern interiors." },
    { name: "Kolkata", region: "West Bengal", image: "/seed/penthouse-view.jpg", blurb: "Heritage addresses and boutique penthouses." },
    { name: "Goa", region: "Coastal India", image: "/seed/coastal-land.jpg", blurb: "Private coastal villas with managed rentals." },
  ],
} as const;

export const LEGAL_LINKS = [
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/terms", label: "Terms of Use" },
] as const;

export function mergeSiteSettings(
  patch: Partial<SiteSettings> | null | undefined,
): SiteSettings {
  const base = DEFAULT_SITE_SETTINGS;
  if (!patch) return structuredClone(base);
  return {
    branding: { ...base.branding, ...patch.branding },
    contact: { ...base.contact, ...patch.contact },
    social: { ...base.social, ...patch.social },
    website: { ...base.website, ...patch.website },
    seo: { ...base.seo, ...patch.seo },
    design: { ...base.design, ...patch.design },
    testimonials: patch.testimonials ?? base.testimonials,
    updatedAt: patch.updatedAt ?? base.updatedAt,
  };
}

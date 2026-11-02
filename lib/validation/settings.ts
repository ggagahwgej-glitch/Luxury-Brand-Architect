import { z } from "zod";

const optionalUrl = z
  .union([z.string().trim().max(500), z.null()])
  .optional()
  .transform((value) => {
    if (!value) return null;
    if (value.startsWith("/")) return value;
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
    } catch {
      return null;
    }
  });

const socialUrl = z
  .union([z.string().trim().max(300), z.null(), z.undefined()])
  .transform((value) => {
    if (!value) return "";
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
    } catch {
      return "";
    }
  });

export const settingsPatchSchema = z.object({
  branding: z
    .object({
      businessName: z.string().trim().min(2).max(80),
      websiteName: z.string().trim().min(2).max(80),
      tagline: z.string().trim().max(120),
      description: z.string().trim().max(600),
      logoUrl: optionalUrl,
      faviconUrl: optionalUrl,
    })
    .partial()
    .optional(),
  contact: z
    .object({
      phone: z.string().trim().max(32),
      whatsapp: z.string().trim().max(32),
      email: z.string().trim().email().max(160),
      address: z.string().trim().max(300),
      mapUrl: optionalUrl,
      hours: z.string().trim().max(120),
    })
    .partial()
    .optional(),
  social: z
    .object({
      facebook: socialUrl,
      instagram: socialUrl,
      linkedin: socialUrl,
      youtube: socialUrl,
    })
    .partial()
    .optional(),
  website: z
    .object({
      heroHeading: z.string().trim().min(4).max(160),
      heroDescription: z.string().trim().max(600),
      heroImageUrl: optionalUrl,
      heroImageAlt: z.string().trim().max(200),
      heroEyebrow: z.string().trim().max(120),
      showCollections: z.boolean(),
      showDestinations: z.boolean(),
      showTestimonials: z.boolean(),
      showExperience: z.boolean(),
      showWhyUs: z.boolean(),
      ctaHeading: z.string().trim().min(4).max(160),
      ctaDescription: z.string().trim().max(400),
      footerNote: z.string().trim().max(400),
    })
    .partial()
    .optional(),
  seo: z
    .object({
      title: z.string().trim().max(160),
      description: z.string().trim().max(320),
      ogImageUrl: optionalUrl,
    })
    .partial()
    .optional(),
  design: z
    .object({
      accent: z.enum(["imperial_gold", "champagne", "bronze", "platinum"]),
      displayFont: z.enum(["cormorant", "playfair"]),
    })
    .partial()
    .optional(),
  testimonials: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        quote: z.string().trim().min(10).max(600),
        author: z.string().trim().min(2).max(80),
        role: z.string().trim().max(120),
        isDemo: z.boolean().default(false),
      }),
    )
    .max(12)
    .optional(),
});

export type SettingsPatchParsed = z.output<typeof settingsPatchSchema>;

import { z } from "zod";
import { AREA_UNITS, MEDIA_TYPES, PROPERTY_PURPOSES, PROPERTY_STATUSES, PROPERTY_TYPES } from "@/lib/types";

/** Coerces "" / null / undefined / "1,200" into a number-or-null before validation. */
function numericField(constraint: z.ZodNumber) {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return null;
    if (typeof value === "number") return value;
    const parsed = Number(String(value).replace(/,/g, ""));
    return Number.isNaN(parsed) ? value : parsed;
  }, constraint.nullable());
}

const optionalPositive = numericField(z.number().min(0, "Must be zero or greater"));
const optionalInt = (max: number, label: string) =>
  numericField(
    z
      .number()
      .int(`${label} must be a whole number`)
      .min(0)
      .max(max, `${label} must be ${max} or fewer`),
  );

const nullableText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim().length > 0 ? value.trim() : null),
    z.string().max(max).nullable(),
  );

export const mediaInputSchema = z.object({
  url: z.string().min(1, "Media URL is required").max(2048),
  storagePath: nullableText(1024),
  mediaType: z.enum(MEDIA_TYPES),
  alt: nullableText(200),
  isCover: z.boolean().optional().default(false),
});

export const propertyInputSchema = z
  .object({
    title: z.string().trim().min(6, "Title must be at least 6 characters").max(140),
    slug: z
      .string()
      .trim()
      .min(3, "Slug is required")
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only"),
    description: z
      .string()
      .trim()
      .min(40, "Description should be at least 40 characters")
      .max(8000, "Description is too long"),
    propertyType: z.enum(PROPERTY_TYPES),
    purpose: z.enum(PROPERTY_PURPOSES),
    price: z
      .union([z.number(), z.string()])
      .transform((value) => (typeof value === "number" ? value : Number(String(value).replace(/,/g, ""))))
      .refine((value) => Number.isFinite(value) && value > 0, { message: "Enter a valid price" }),
    currency: z.string().trim().length(3, "Use a 3-letter currency code").toUpperCase().default("INR"),
    location: z.string().trim().min(2, "Location is required").max(120),
    address: nullableText(300),
    bedrooms: optionalInt(50, "Bedrooms"),
    bathrooms: optionalInt(50, "Bathrooms"),
    balconies: optionalInt(50, "Balconies"),
    builtUpArea: optionalPositive,
    carpetArea: optionalPositive,
    plotArea: optionalPositive,
    areaUnit: z.enum(AREA_UNITS).default("sqft"),
    amenities: z.array(z.string().trim().min(1).max(60)).max(40).default([]),
    features: z.array(z.string().trim().min(1).max(60)).max(40).default([]),
    status: z.enum(PROPERTY_STATUSES).default("available"),
    isFeatured: z.boolean().default(false),
    isPublished: z.boolean().default(false),
    latitude: numericField(z.number().min(-90, "Latitude must be between -90 and 90").max(90)),
    longitude: numericField(z.number().min(-180, "Longitude must be between -180 and 180").max(180)),
    media: z.array(mediaInputSchema).max(25).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.isPublished && value.media.filter((m) => m.mediaType === "image").length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["media"],
        message: "Add at least one image before publishing this property.",
      });
    }
    if (value.purpose === "rent" && value.price > 5_000_000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "A monthly rent above 50,00,000 looks incorrect — please confirm the price.",
      });
    }
  });

export type PropertyFormInput = z.input<typeof propertyInputSchema>;
export type PropertyParsed = z.output<typeof propertyInputSchema>;

export function flattenIssues(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

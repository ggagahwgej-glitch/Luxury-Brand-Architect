import { describe, expect, it } from "vitest";
import { inquirySchema } from "@/lib/validation/inquiry";
import { loginSchema } from "@/lib/validation/auth";
import { propertyInputSchema } from "@/lib/validation/property";
import { slugify } from "@/lib/utils";
import { whatsappLink, formatArea, formatCurrency } from "@/lib/format";

const baseProperty = {
  title: "Aurum Riverside Residence",
  slug: "aurum-riverside-residence",
  description: "A considered private residence with landscaped terraces and panoramic river views.",
  propertyType: "villa",
  purpose: "sale",
  price: "42500000",
  currency: "inr",
  location: "Guwahati",
  areaUnit: "sqft",
  media: [{ url: "https://example.com/a.jpg", mediaType: "image", isCover: true }],
  isPublished: true,
};

describe("property validation", () => {
  it("normalises a valid payload", () => {
    const parsed = propertyInputSchema.parse(baseProperty);
    expect(parsed.price).toBe(42500000);
    expect(parsed.currency).toBe("INR");
    expect(parsed.media).toHaveLength(1);
  });

  it("blocks publishing without imagery", () => {
    const result = propertyInputSchema.safeParse({ ...baseProperty, media: [] });
    expect(result.success).toBe(false);
  });

  it("rejects malformed slugs", () => {
    const result = propertyInputSchema.safeParse({ ...baseProperty, slug: "Not A Slug!" });
    expect(result.success).toBe(false);
  });

  it("rejects implausible monthly rents", () => {
    const result = propertyInputSchema.safeParse({
      ...baseProperty,
      propertyType: "apartment",
      purpose: "rent",
      price: 90000000,
    });
    expect(result.success).toBe(false);
  });
});

describe("inquiry validation", () => {
  const valid = {
    name: "Rohan Mehta",
    phone: "+91 98640 21000",
    email: "rohan@example.com",
    message: "I would like to schedule a private viewing this week.",
    intent: "visit",
    propertyId: null,
  };

  it("accepts a complete inquiry", () => {
    expect(inquirySchema.safeParse(valid).success).toBe(true);
  });

  it("rejects filler names and bad emails", () => {
    expect(inquirySchema.safeParse({ ...valid, name: "a" }).success).toBe(false);
    expect(inquirySchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
    expect(inquirySchema.safeParse({ ...valid, phone: "123" }).success).toBe(false);
  });

  it("rejects a filled honeypot", () => {
    expect(inquirySchema.safeParse({ ...valid, company: "spam" }).success).toBe(false);
  });
});

describe("owner login validation", () => {
  it("requires a 12 digit access code", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "longpassword", code: "123456789012" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "a@b.com", password: "longpassword", code: "12345678901" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.com", password: "longpassword", code: "12345678901a" }).success).toBe(false);
  });
});

describe("formatting and helpers", () => {
  it("slugifies titles", () => {
    expect(slugify("Aurum & Co. — Riverside Estate!")).toBe("aurum-and-co-riverside-estate");
  });
  it("formats currency and area", () => {
    expect(formatCurrency(42500000, "INR")).toMatch(/4,25,00,000|42,500,000/);
    expect(formatArea(2400, "sqft")).toBe("2,400 sq ft");
    expect(formatArea(null, "sqft")).toBeNull();
  });
  it("builds WhatsApp links", () => {
    expect(whatsappLink("+91 98640 21000", "Hello")).toBe("https://wa.me/919864021000?text=Hello");
    expect(whatsappLink("")).toBeNull();
  });
});

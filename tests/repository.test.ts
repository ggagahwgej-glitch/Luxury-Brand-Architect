import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

// The local store resolves its directory at import time — set it first.
const dataDir = mkdtempSync(path.join(tmpdir(), "aurum-repo-"));
process.env.LOCAL_DATA_DIR = dataDir;

let repository: import("@/lib/data/repository").Repository;
let LocalRepositoryClass: typeof import("@/lib/data/local/repository").LocalRepository;

beforeAll(async () => {
  const mod = await import("@/lib/data/local/repository");
  LocalRepositoryClass = mod.LocalRepository;
  repository = new mod.LocalRepository();
});

const baseInput = {
  slug: "qa-test-residence",
  title: "QA Test Residence",
  description:
    "A residence created by the automated test suite to verify the complete create, update, duplicate and delete workflow.",
  propertyType: "villa" as const,
  purpose: "sale" as const,
  price: 25_000_000,
  currency: "INR",
  location: "Guwahati, Assam",
  address: "Test Road, Guwahati",
  bedrooms: 4,
  bathrooms: 3,
  balconies: 2,
  builtUpArea: 3200,
  carpetArea: 2800,
  plotArea: 6000,
  areaUnit: "sqft" as const,
  amenities: ["Private Pool"],
  features: ["Private Terrace"],
  status: "available" as const,
  isFeatured: false,
  isPublished: true,
  latitude: 26.15,
  longitude: 91.77,
  media: [
    { url: "/seed/villa-exterior.jpg", storagePath: null, mediaType: "image" as const, alt: "Test villa", isCover: true },
  ],
};

describe("local provider", () => {
  it("seeds demonstration records and hides drafts from public queries", async () => {
    const publicResult = await repository.listProperties({ pageSize: 50 });
    expect(publicResult.total).toBeGreaterThan(0);
    expect(publicResult.items.every((property) => property.isPublished)).toBe(true);
    // Sold / rented records are excluded unless explicitly requested.
    expect(publicResult.items.every((property) => ["available", "under_offer"].includes(property.status))).toBe(true);

    const all = await repository.listProperties({ pageSize: 50, includeUnpublished: true, availabilityOnly: false });
    expect(all.total).toBeGreaterThan(publicResult.total);
  });

  it("filters by purpose, type, budget and search terms", async () => {
    const rentals = await repository.listProperties({ purpose: "rent", pageSize: 50 });
    expect(rentals.items.length).toBeGreaterThan(0);
    expect(rentals.items.every((property) => property.purpose === "rent")).toBe(true);

    const villas = await repository.listProperties({ propertyType: "villa", pageSize: 50 });
    expect(villas.items.every((property) => property.propertyType === "villa")).toBe(true);

    const budget = await repository.listProperties({ maxPrice: 40_000_000, pageSize: 50 });
    expect(budget.items.every((property) => property.price <= 40_000_000)).toBe(true);

    const search = await repository.listProperties({ q: "penthouse", pageSize: 50 });
    expect(search.total).toBeGreaterThan(0);
  });

  it("sorts by price and paginates", async () => {
    const ascending = await repository.listProperties({ sort: "price_asc", pageSize: 50 });
    const prices = ascending.items.map((property) => property.price);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);

    const pageOne = await repository.listProperties({ page: 1, pageSize: 2 });
    const pageTwo = await repository.listProperties({ page: 2, pageSize: 2 });
    expect(pageOne.items).toHaveLength(2);
    expect(pageOne.items[0]?.id).not.toBe(pageTwo.items[0]?.id);
    expect(pageOne.pageCount).toBeGreaterThan(1);
  });

  it("creates, reads, updates, duplicates and deletes a property", async () => {
    const created = await repository.createProperty(baseInput);
    expect(created.slug).toBe("qa-test-residence");
    expect(created.media).toHaveLength(1);
    expect(created.media[0]?.isCover).toBe(true);

    const bySlug = await repository.getPropertyBySlug("qa-test-residence");
    expect(bySlug?.id).toBe(created.id);

    const updated = await repository.updateProperty(created.id, {
      ...baseInput,
      title: "QA Test Residence Updated",
      price: 26_500_000,
      isPublished: false,
    });
    expect(updated.title).toBe("QA Test Residence Updated");
    expect(updated.price).toBe(26_500_000);

    // Unpublished records disappear from public reads.
    expect(await repository.getPropertyBySlug("qa-test-residence")).toBeNull();

    const duplicate = await repository.duplicateProperty(created.id);
    expect(duplicate.slug).not.toBe(created.slug);
    expect(duplicate.isPublished).toBe(false);

    await repository.deleteProperty(created.id);
    expect(await repository.getPropertyById(created.id)).toBeNull();
    await repository.deleteProperty(duplicate.id);
  });

  it("stores enquiries against a property and updates their status", async () => {
    const property = await repository.getPropertyBySlug("aurum-riverside-residence");
    expect(property).not.toBeNull();

    const inquiry = await repository.createInquiry(
      {
        propertyId: property!.id,
        name: "Test Client",
        phone: "+91 90000 00000",
        email: "client@example.com",
        message: "Please arrange a viewing of this residence next week.",
        intent: "visit",
      },
      { ipHash: "test-hash" },
    );
    expect(inquiry.propertyTitle).toBe(property!.title);
    expect(inquiry.status).toBe("new");

    const list = await repository.listInquiries({ pageSize: 50 });
    expect(list.items.some((item) => item.id === inquiry.id)).toBe(true);

    await repository.updateInquiryStatus(inquiry.id, "contacted");
    expect((await repository.getInquiry(inquiry.id))?.status).toBe("contacted");

    await repository.deleteInquiry(inquiry.id);
    expect(await repository.getInquiry(inquiry.id)).toBeNull();
  });

  it("persists site settings across reads", async () => {
    const before = await repository.getSiteSettings();
    const updated = await repository.updateSiteSettings({ branding: { tagline: "Test Tagline" } });
    expect(updated.branding.tagline).toBe("Test Tagline");
    expect(updated.branding.businessName).toBe(before.branding.businessName);

    const reread = await repository.getSiteSettings();
    expect(reread.branding.tagline).toBe("Test Tagline");
  });

  it("reports dashboard statistics from real records", async () => {
    const stats = await repository.getDashboardStats();
    expect(stats.totalProperties).toBeGreaterThan(0);
    expect(stats.publishedProperties).toBeLessThanOrEqual(stats.totalProperties);
    expect(stats.inquiriesLast14Days).toHaveLength(14);
    expect(stats.unreadInquiries).toBeGreaterThanOrEqual(0);
  });
});

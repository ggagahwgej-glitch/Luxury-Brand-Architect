import { promises as fs } from "node:fs";
import path from "node:path";
import { SEED_PROPERTIES, SEED_SETTINGS } from "@/lib/data/local/seed";
import { mergeSiteSettings } from "@/lib/config/site";
import type { Inquiry, Property, PropertyMedia, SiteSettings } from "@/lib/types";
import { uuid } from "@/lib/utils";

/**
 * JSON-file store used exclusively by the development preview provider.
 * Writes are serialised through a promise queue and committed atomically so a
 * crash can never leave a half-written database behind.
 */

export interface LocalDatabase {
  version: 1;
  properties: Property[];
  inquiries: Inquiry[];
  settings: SiteSettings;
}

const DATA_DIR = process.env.LOCAL_DATA_DIR ?? path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

let cache: LocalDatabase | null = null;
let queue: Promise<unknown> = Promise.resolve();

export async function ensureDataDir() {
  await fs.mkdir(path.join(DATA_DIR, "uploads"), { recursive: true });
}

export function uploadsDir() {
  return path.join(DATA_DIR, "uploads");
}

function buildSeed(): LocalDatabase {
  const properties: Property[] = SEED_PROPERTIES.map((seed) => {
    const { images, ...rest } = seed;
    const media: PropertyMedia[] = images.map((image, index) => ({
      id: uuid(),
      propertyId: seed.id,
      url: `/seed/${image.file}`,
      storagePath: null,
      mediaType: "image",
      sortOrder: index,
      isCover: index === 0,
      alt: image.alt,
      createdAt: seed.createdAt,
    }));
    return { ...rest, media };
  });

  const inquiries: Inquiry[] = [
    {
      id: uuid(),
      propertyId: properties[0]?.id ?? null,
      propertyTitle: properties[0]?.title ?? null,
      name: "Ananya Baruah",
      phone: "+91 98640 33112",
      email: "ananya.baruah@example.com",
      message:
        "We are relocating from Bengaluru in March and would like to arrange a private viewing of the riverside residence.",
      intent: "visit",
      status: "new",
      createdAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
    },
    {
      id: uuid(),
      propertyId: properties[3]?.id ?? null,
      propertyTitle: properties[3]?.title ?? null,
      name: "Vikram Sarin",
      phone: "+91 98300 47712",
      email: "vikram.sarin@example.com",
      message: "Is the estate still available? We would want a structural survey before proceeding.",
      intent: "availability",
      status: "read",
      createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86_400_000).toISOString(),
    },
    {
      id: uuid(),
      propertyId: null,
      propertyTitle: null,
      name: "Meera Nair",
      phone: "+91 90040 21009",
      email: "meera.nair@example.com",
      message: "Looking for a serviced three-bedroom residence in Guwahati from June. Please call back.",
      intent: "callback",
      status: "contacted",
      createdAt: new Date(Date.now() - 6 * 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - 4 * 86_400_000).toISOString(),
    },
  ];

  return {
    version: 1,
    properties,
    inquiries,
    settings: mergeSiteSettings(SEED_SETTINGS),
  };
}

async function load(): Promise<LocalDatabase> {
  if (cache) return cache;
  await ensureDataDir();
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as LocalDatabase;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.properties)) {
      throw new Error("Unrecognised local database format");
    }
    cache = { ...parsed, settings: mergeSiteSettings(parsed.settings) };
    return cache;
  } catch (error) {
    const isMissing = (error as NodeJS.ErrnoException).code === "ENOENT";
    if (!isMissing) console.warn("[local-provider] rebuilding preview database:", error);
    cache = buildSeed();
    await persist(cache);
    return cache;
  }
}

async function persist(db: LocalDatabase) {
  await ensureDataDir();
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DB_FILE);
}

/** Serialises a read-modify-write cycle and returns the mutation result. */
export function withDatabase<T>(mutator: (db: LocalDatabase) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await load();
    const result = await mutator(db);
    await persist(db);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

export async function readDatabase(): Promise<LocalDatabase> {
  return load();
}

export async function resetDatabase() {
  cache = buildSeed();
  await persist(cache);
}

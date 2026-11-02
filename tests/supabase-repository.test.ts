import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * These tests exercise the PostgREST query strings the Supabase provider
 * builds — the part that cannot be covered by the JSON-preview provider and the
 * part that silently breaks in production (wrong filter, unescaped search term,
 * a draft leaking into a public read).
 *
 * A fake client records every chained call instead of making a network request.
 */

type Op = { method: string; args: unknown[] };

class FakeQuery {
  ops: Op[] = [];
  countResult = 0;
  rows: unknown[] = [];

  constructor(readonly table: string) {}

  select(...args: unknown[]) {
    this.ops.push({ method: "select", args });
    return this;
  }
  eq(...args: unknown[]) {
    this.ops.push({ method: "eq", args });
    return this;
  }
  neq(...args: unknown[]) {
    this.ops.push({ method: "neq", args });
    return this;
  }
  in(...args: unknown[]) {
    this.ops.push({ method: "in", args });
    return this;
  }
  gte(...args: unknown[]) {
    this.ops.push({ method: "gte", args });
    return this;
  }
  lte(...args: unknown[]) {
    this.ops.push({ method: "lte", args });
    return this;
  }
  ilike(...args: unknown[]) {
    this.ops.push({ method: "ilike", args });
    return this;
  }
  or(...args: unknown[]) {
    this.ops.push({ method: "or", args });
    return this;
  }
  order(...args: unknown[]) {
    this.ops.push({ method: "order", args });
    return this;
  }
  limit(...args: unknown[]) {
    this.ops.push({ method: "limit", args });
    return this;
  }
  range(...args: unknown[]) {
    this.ops.push({ method: "range", args });
    return this;
  }
  insert(...args: unknown[]) {
    this.ops.push({ method: "insert", args });
    return this;
  }
  update(...args: unknown[]) {
    this.ops.push({ method: "update", args });
    return this;
  }
  upsert(...args: unknown[]) {
    this.ops.push({ method: "upsert", args });
    return this;
  }
  delete() {
    this.ops.push({ method: "delete", args: [] });
    return this;
  }

  private result() {
    return { data: this.rows, error: null, count: this.countResult };
  }

  maybeSingle() {
    this.ops.push({ method: "maybeSingle", args: [] });
    return Promise.resolve({ data: this.rows[0] ?? null, error: null });
  }
  single() {
    this.ops.push({ method: "single", args: [] });
    return Promise.resolve({ data: this.rows[0] ?? null, error: null });
  }
  then<T>(resolve: (value: ReturnType<FakeQuery["result"]>) => T) {
    return Promise.resolve(this.result()).then(resolve);
  }
}

const history: { client: "public" | "admin"; query: FakeQuery }[] = [];
let count = 0;

function makeClient(kind: "public" | "admin") {
  return {
    from(table: string) {
      const query = new FakeQuery(table);
      query.countResult = count;
      history.push({ client: kind, query });
      return query;
    },
  };
}

vi.mock("@/lib/data/supabase/client", () => ({
  getPublicClient: () => makeClient("public"),
  getServiceClient: () => makeClient("admin"),
}));

const { SupabaseRepository } = await import("@/lib/data/supabase/repository");
const repository = new SupabaseRepository();

function lastQuery() {
  const entry = history.at(-1);
  if (!entry) throw new Error("no query recorded");
  return entry;
}

function opsFor(method: string) {
  return lastQuery().query.ops.filter((op) => op.method === method).map((op) => op.args);
}

beforeEach(() => {
  history.length = 0;
  count = 0;
});

describe("Supabase provider — public property reads", () => {
  it("only asks for published, available listings by default", async () => {
    await repository.listProperties({});
    const entry = lastQuery();
    expect(entry.client).toBe("public");
    expect(opsFor("eq")).toContainEqual(["is_published", true]);
    expect(opsFor("in")).toContainEqual(["status", ["available", "under_offer"]]);
    expect(opsFor("order")[0]).toEqual(["created_at", { ascending: false }]);
    expect(opsFor("range")[0]).toEqual([0, 8]);
  });

  it("uses the service role when unpublished rows are requested", async () => {
    await repository.listProperties({ includeUnpublished: true });
    expect(lastQuery().client).toBe("admin");
    expect(opsFor("eq")).not.toContainEqual(["is_published", true]);
  });

  it("never lets a draft be fetched through the public slug route", async () => {
    await repository.getPropertyBySlug("river-villa");
    expect(opsFor("eq")).toContainEqual(["slug", "river-villa"]);
    expect(opsFor("eq")).toContainEqual(["is_published", true]);
  });

  it("allows the Studio to load a draft by slug", async () => {
    await repository.getPropertyBySlug("river-villa", { includeUnpublished: true });
    expect(lastQuery().client).toBe("admin");
    expect(opsFor("eq")).not.toContainEqual(["is_published", true]);
  });

  it("sorts areas on the generated area_display column", async () => {
    await repository.listProperties({ sort: "area_desc" });
    expect(opsFor("order")[0]).toEqual(["area_display", { ascending: false, nullsFirst: false }]);
  });

  it("strips PostgREST separators out of the search term", async () => {
    await repository.listProperties({ q: "Aurum, (villa) 100% *best* 'quoted'" });
    const or = String(opsFor("or")[0]?.[0] ?? "");
    // `ilike` wraps the term in %…% wildcards; the term itself must be clean.
    const term = (or.split("title.ilike.")[1]?.split(",")[0] ?? "").replace(/^%|%$/g, "");
    expect(term).not.toBe("");
    expect(term).not.toMatch(/[%,()*"']/);
    expect(or).toContain("location.ilike.");
    expect(or).toContain("description.ilike.");
  });

  it("escapes the inquiry search term too", async () => {
    await repository.listInquiries({ q: "singh, (delhi)" });
    const or = String(opsFor("or")[0]?.[0] ?? "");
    expect(or).toContain("name.ilike.");
    expect(or.split(",").every((part) => !part.includes("("))).toBe(true);
  });

  it("clamps an out-of-range page back to the last page instead of showing nothing", async () => {
    count = 5;
    const page = await repository.listProperties({ page: 99, pageSize: 9 });
    expect(page.page).toBe(1);
    expect(page.total).toBe(5);
    expect(opsFor("range").at(-1)).toEqual([0, 8]);
  });

  it("returns 404-shaped null for a malformed property id", async () => {
    const property = await repository.getPropertyById("not-a-uuid");
    expect(property).toBeNull();
    expect(history).toHaveLength(0);
  });
});

describe("Supabase provider — price and area filters", () => {
  it("applies numeric bounds to the right columns", async () => {
    await repository.listProperties({ minPrice: 100, maxPrice: 900, minArea: 1200, maxArea: 4000, minBedrooms: 3 });
    expect(opsFor("gte")).toContainEqual(["price", 100]);
    expect(opsFor("lte")).toContainEqual(["price", 900]);
    expect(opsFor("gte")).toContainEqual(["area_display", 1200]);
    expect(opsFor("lte")).toContainEqual(["area_display", 4000]);
    expect(opsFor("gte")).toContainEqual(["bedrooms", 3]);
  });
});

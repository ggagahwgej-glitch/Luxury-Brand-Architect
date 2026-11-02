/**
 * Reports (and optionally deletes) storage objects that are no longer attached
 * to any property record — for example after an interrupted upload.
 *
 *   npm run storage:prune            # dry run
 *   npm run storage:prune -- --apply # delete orphans
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import "./load-env";
import { createClient } from "@supabase/supabase-js";

/** Every URL-ish field in site_settings that can point at a stored asset. */
function brandAssetValues(settings: Record<string, unknown> | undefined): string[] {
  if (!settings) return [];
  const values: string[] = [];
  for (const section of ["branding", "website", "seo"]) {
    const group = settings[section];
    if (!group || typeof group !== "object") continue;
    for (const value of Object.values(group as Record<string, unknown>)) {
      if (typeof value === "string" && value.startsWith("http")) values.push(value);
      if (typeof value === "string" && value.startsWith("/api/media/")) values.push(value);
    }
  }
  return values;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "property-media";
  const provider = process.env.DATA_PROVIDER ?? "supabase";

  if (provider === "local") {
    const dir = path.join(process.env.LOCAL_DATA_DIR ?? path.join(process.cwd(), ".data"), "uploads");
    const dbFile = path.join(process.env.LOCAL_DATA_DIR ?? path.join(process.cwd(), ".data"), "db.json");
    const db = JSON.parse(await fs.readFile(dbFile, "utf8")) as {
      properties: { media: { storagePath: string | null }[] }[];
      settings?: Record<string, unknown>;
    };
    const used = new Set(
      db.properties.flatMap((property) => property.media.map((media) => media.storagePath).filter(Boolean) as string[]),
    );
    // Brand assets (logo, favicon, OG image, hero) live in site_settings, not in
    // property_media — without this they would be reported as orphans and
    // deleted by --apply.
    for (const value of brandAssetValues(db.settings)) {
      const marker = "/api/media/";
      const index = value.indexOf(marker);
      if (index !== -1) used.add(value.slice(index + marker.length).split(/[?#]/)[0] ?? "");
    }
    const files = await fs.readdir(dir).catch(() => []);
    const orphans = files.filter((file) => !used.has(file));
    console.log(`Local preview uploads: ${files.length} file(s), ${used.size} referenced, ${orphans.length} orphan(s).`);
    for (const orphan of orphans) {
      console.log(` - ${orphan}`);
      if (apply) await fs.rm(path.join(dir, orphan), { force: true });
    }
    console.log(apply ? "Orphans deleted." : "Dry run — re-run with --apply to delete.");
    return;
  }

  if (!url || !key) {
    console.error("✗ Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
    process.exit(1);
  }

  const admin = createClient(url, key, { auth: { persistSession: false } });

  const { data: mediaRows, error: mediaError } = await admin.from("property_media").select("storage_path");
  if (mediaError) throw new Error(mediaError.message);
  const referenced = new Set(
    (mediaRows ?? []).map((row) => (row as { storage_path: string | null }).storage_path).filter(Boolean) as string[],
  );

  // Brand assets are referenced from site_settings URLs rather than
  // property_media, so they must be counted before anything is deleted.
  const { data: settingsRows } = await admin.from("site_settings").select("*").eq("id", 1);
  const marker = `/storage/v1/object/public/${bucket}/`;
  for (const row of settingsRows ?? []) {
    for (const value of brandAssetValues(row as Record<string, unknown>)) {
      const index = value.indexOf(marker);
      if (index !== -1) referenced.add(decodeURIComponent(value.slice(index + marker.length).split(/[?#]/)[0] ?? ""));
    }
  }

  const files: string[] = [];
  let page = 0;
  const limit = 100;
  for (;;) {
    const { data, error } = await admin.storage.from(bucket).list("", { limit, offset: page * limit });
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    for (const item of data) {
      if (item.id === null) {
        // folder — list recursively one level (properties/YYYY)
        const { data: nested } = await admin.storage.from(bucket).list(item.name, { limit: 1000 });
        for (const child of nested ?? []) files.push(`${item.name}/${child.name}`);
      } else {
        files.push(item.name);
      }
    }
    if (data.length < limit) break;
    page += 1;
  }

  // Anything under brand/ is a curated brand asset — never prune that folder.
  const orphans = files.filter((file) => !file.startsWith("brand/") && !referenced.has(file));
  console.log(`Bucket "${bucket}": ${files.length} object(s), ${referenced.size} referenced, ${orphans.length} orphan(s).`);
  for (const orphan of orphans) {
    console.log(` - ${orphan}`);
    if (apply) {
      const { error } = await admin.storage.from(bucket).remove([orphan]);
      if (error) console.error(`   failed: ${error.message}`);
    }
  }
  console.log(apply ? "Orphans deleted." : "Dry run — re-run with --apply to delete.");
}

main().catch((error) => {
  console.error("✗ Prune failed:", error);
  process.exit(1);
});

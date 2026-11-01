import "server-only";
import { cache } from "react";
import { resolveDataProvider } from "@/lib/env";
import type { Repository } from "@/lib/data/repository";
import { LocalRepository } from "@/lib/data/local/repository";
import { SupabaseRepository } from "@/lib/data/supabase/repository";
import type { SiteSettings } from "@/lib/types";

let repository: Repository | null = null;

/**
 * Provider factory. Supabase in production, a local preview store in
 * development when Supabase credentials are not present.
 */
export function getRepository(): Repository {
  if (repository) return repository;
  const provider = resolveDataProvider();
  repository = provider === "supabase" ? new SupabaseRepository() : new LocalRepository();
  return repository;
}

export function isPreviewProvider() {
  return resolveDataProvider() === "local";
}

/** Site settings are needed by every layout — deduped per request. */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    return await getRepository().getSiteSettings();
  } catch (error) {
    console.error("[settings] falling back to defaults:", error);
    const { DEFAULT_SITE_SETTINGS } = await import("@/lib/config/site");
    return DEFAULT_SITE_SETTINGS;
  }
});

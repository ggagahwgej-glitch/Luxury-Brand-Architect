import "server-only";
import { getServiceClient } from "@/lib/data/supabase/client";
import { resolveDataProvider } from "@/lib/env";
import { describeDatabaseError } from "@/lib/db-errors";

export interface DatabaseHealth {
  ok: boolean;
  provider: "supabase" | "local";
  detail?: string;
}

/**
 * Cheap readiness probe used by the sign-in screen: are the tables there and is
 * the secret key accepted? Keeps "Owner profile could not be verified" from
 * being the first thing a fresh deployment shows.
 */
export async function databaseHealth(): Promise<DatabaseHealth> {
  let provider: "supabase" | "local" = "supabase";
  try {
    provider = resolveDataProvider();
  } catch {
    return { ok: false, provider: "supabase", detail: "No data provider is configured on this deployment." };
  }

  if (provider === "local") return { ok: true, provider };

  try {
    const { error } = await getServiceClient().from("profiles").select("id", { head: true, count: "exact" });
    if (error) return { ok: false, provider, detail: describeDatabaseError(error) };
    return { ok: true, provider };
  } catch (error) {
    return {
      ok: false,
      provider,
      detail: describeDatabaseError(error instanceof Error ? { message: error.message } : null),
    };
  }
}

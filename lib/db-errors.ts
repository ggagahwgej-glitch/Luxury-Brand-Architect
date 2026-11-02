/**
 * Shared translation of PostgREST / network failures into something an owner
 * (or the person deploying) can act on. Pure, no imports — usable from route
 * handlers, server components and scripts.
 */
export function describeDatabaseError(error: { message?: string; code?: string } | null | undefined): string {
  const message = error?.message ?? "";
  const code = error?.code ?? "";

  if (/does not exist|schema cache|PGRST205|42P01/i.test(message) || code === "42P01") {
    return "The database is not set up yet. Run supabase/apply-all.sql in the Supabase SQL editor, then try again.";
  }
  if (/invalid api key|no api key|jwt|unauthori[sz]ed|permission denied|row-level security|401|403/i.test(message)) {
    return "The server could not authenticate to the database. SUPABASE_SERVICE_ROLE_KEY is missing or wrong on this deployment.";
  }
  if (/fetch failed|network|ENOTFOUND|ECONNREFUSED|timeout/i.test(message)) {
    return "The database could not be reached. Check that the Supabase project is running and NEXT_PUBLIC_SUPABASE_URL is correct.";
  }
  return "The database request failed. Please try again in a moment.";
}

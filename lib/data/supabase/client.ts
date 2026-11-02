import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseAnonKey, supabaseServiceRoleKey, supabaseUrl } from "@/lib/env";

let anonClient: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

const options = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
} as const;

/**
 * Anonymous client — obeys Row Level Security. Used for public reads so the
 * database policies are exercised by the same path visitors use.
 */
export function getPublicClient(): SupabaseClient {
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  anonClient ??= createClient(supabaseUrl, supabaseAnonKey, options);
  return anonClient;
}

/**
 * Service-role client — bypasses RLS. Server-only. Importing this module from a
 * client component is blocked by the `server-only` guard above.
 */
export function getServiceClient(): SupabaseClient {
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase service role is not configured. Set SUPABASE_SERVICE_ROLE_KEY (server-side only).");
  }
  serviceClient ??= createClient(supabaseUrl, supabaseServiceRoleKey, options);
  return serviceClient;
}

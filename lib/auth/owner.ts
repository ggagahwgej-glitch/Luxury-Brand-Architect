import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import {
  isSupabaseConfigured,
  localOwnerCredentials,
  ownerAccessCodeRequired,
  resolveDataProvider,
  supabaseAnonKey,
  supabaseUrl,
} from "@/lib/env";
import { getServiceClient } from "@/lib/data/supabase/client";
import { hashIdentifier } from "@/lib/auth/rate-limit";
import { describeDatabaseError } from "@/lib/db-errors";

/**
 * Owner authentication.
 *
 * Three independent factors, all verified server-side:
 *   1. Supabase Auth email + password (proves account ownership)
 *   2. profiles.role = 'owner' AND profiles.is_authorized = true
 *   3. the permanent 12-digit access code, compared against a bcrypt hash
 *      stored in owner_security — never in plaintext, never in the frontend.
 */

export interface OwnerIdentity {
  id: string;
  email: string;
  name: string;
}

export type OwnerAuthResult =
  | { ok: true; owner: OwnerIdentity }
  | { ok: false; reason: "invalid" | "locked" | "disabled" | "config"; message: string; retryAfterSeconds?: number };

const MAX_CODE_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function constantTimeEquals(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

const genericFailure: OwnerAuthResult = {
  ok: false,
  reason: "invalid",
  message: "Those credentials were not accepted. Please check your details and try again.",
};

export async function authenticateOwner(input: {
  email: string;
  password: string;
  code: string;
  ipHash?: string;
}): Promise<OwnerAuthResult> {
  const provider = resolveDataProvider();

  if (provider === "local") {
    const credentials = localOwnerCredentials();
    if (!credentials) {
      return {
        ok: false,
        reason: "config",
        message:
          "The preview provider has no owner credentials. Set LOCAL_OWNER_EMAIL, LOCAL_OWNER_PASSWORD and LOCAL_OWNER_CODE in .env.local.",
      };
    }
    const { email, password, code } = credentials;
    const matches =
      constantTimeEquals(input.email.toLowerCase(), email.toLowerCase()) &&
      constantTimeEquals(input.password, password) &&
      (!ownerAccessCodeRequired || constantTimeEquals(input.code, code));
    if (!matches) return genericFailure;
    return {
      ok: true,
      owner: { id: "local-preview-owner", email, name: "Owner (Preview)" },
    };
  }

  if (!isSupabaseConfigured || !supabaseUrl || !supabaseAnonKey) {
    return {
      ok: false,
      reason: "config",
      message: "Supabase is not configured. Set the environment variables described in README.md.",
    };
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: signIn, error: signInError } = await authClient.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (signInError || !signIn.user?.id) {
    // A database/network failure is not a wrong password — say so, otherwise
    // the owner keeps retyping a correct password and locks the account.
    if (signInError && /fetch failed|network|timeout|ENOTFOUND|ECONNREFUSED|invalid api key|no api key/i.test(signInError.message)) {
      console.error("[auth] sign-in could not reach Supabase:", signInError.message);
      return {
        ok: false,
        reason: "config",
        message:
          "The authentication service could not be reached. Check the Supabase URL and keys in this deployment, then try again.",
      };
    }
    await recordAttempt(input.email, input.ipHash, false);
    return genericFailure; // identical message — no user enumeration
  }

  // The Supabase session is discarded immediately; the Studio uses its own
  // signed, HttpOnly cookie instead of a browser-held Supabase JWT.
  await authClient.auth.signOut().catch(() => undefined);

  const admin = getServiceClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email, full_name, role, is_authorized")
    .eq("id", signIn.user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[auth] profile lookup failed:", profileError.message);
    return { ok: false, reason: "config", message: describeDatabaseError(profileError) };
  }

  const ownerProfile = profile as
    | { id: string; email: string | null; full_name: string | null; role: string | null; is_authorized: boolean | null }
    | null;

  if (!ownerProfile) {
    await recordAttempt(input.email, input.ipHash, false);
    return {
      ok: false,
      reason: "disabled",
      message:
        "No owner profile exists for this account yet. Run `npm run owner:create` for this email to provision it, then sign in again.",
    };
  }

  if (ownerProfile.role !== "owner" || ownerProfile.is_authorized !== true) {
    await recordAttempt(input.email, input.ipHash, false);
    return {
      ok: false,
      reason: "disabled",
      message:
        "This account is not authorised for the Owner Studio. The profiles row must have role = 'owner' and is_authorized = true.",
    };
  }

  // Second factor switched off by the owner: email + password + the authorised
  // profile are enough. The `owner_security` row is never read in this mode.
  if (!ownerAccessCodeRequired) {
    await recordAttempt(input.email, input.ipHash, true);
    return {
      ok: true,
      owner: {
        id: ownerProfile.id,
        email: ownerProfile.email ?? input.email,
        name: ownerProfile.full_name?.trim() || ownerProfile.email || "Owner",
      },
    };
  }

  const { data: security, error: securityError } = await admin
    .from("owner_security")
    .select("secret_code_hash, failed_attempts, locked_until")
    .eq("user_id", signIn.user.id)
    .maybeSingle();

  if (securityError) {
    console.error("[auth] security lookup failed:", securityError.message);
    return { ok: false, reason: "config", message: describeDatabaseError(securityError) };
  }

  const securityRow = security as
    | { secret_code_hash: string; failed_attempts: number | null; locked_until: string | null }
    | null;

  if (!securityRow?.secret_code_hash) {
    return {
      ok: false,
      reason: "config",
      message:
        "This deployment asks for a 12-digit code (OWNER_ACCESS_CODE=enabled) but none is configured. Run `npm run owner:create` with a code, or remove OWNER_ACCESS_CODE to sign in with email + password only.",
    };
  }

  if (securityRow.locked_until && Date.parse(securityRow.locked_until) > Date.now()) {
    const retryAfterSeconds = Math.max(1, Math.ceil((Date.parse(securityRow.locked_until) - Date.now()) / 1000));
    return {
      ok: false,
      reason: "locked",
      message: `Too many incorrect codes. Owner access is locked for another ${Math.ceil(retryAfterSeconds / 60)} minute(s).`,
      retryAfterSeconds,
    };
  }

  const codeMatches = await bcrypt.compare(input.code, securityRow.secret_code_hash);
  if (!codeMatches) {
    const attempts = (securityRow.failed_attempts ?? 0) + 1;
    const shouldLock = attempts >= MAX_CODE_ATTEMPTS;
    await admin
      .from("owner_security")
      .update({
        failed_attempts: shouldLock ? 0 : attempts,
        locked_until: shouldLock ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", signIn.user.id);
    await recordAttempt(input.email, input.ipHash, false);
    return shouldLock
      ? {
          ok: false,
          reason: "locked",
          message: `Five incorrect codes entered. Owner access is locked for ${LOCK_MINUTES} minutes.`,
          retryAfterSeconds: LOCK_MINUTES * 60,
        }
      : {
          ok: false,
          reason: "invalid",
          message: `That access code was not accepted. ${MAX_CODE_ATTEMPTS - attempts} attempt(s) remaining.`,
        };
  }

  await admin
    .from("owner_security")
    .update({ failed_attempts: 0, locked_until: null, updated_at: new Date().toISOString() })
    .eq("user_id", signIn.user.id);
  await recordAttempt(input.email, input.ipHash, true);

  return {
    ok: true,
    owner: {
      id: ownerProfile.id,
      email: ownerProfile.email ?? input.email,
      name: ownerProfile.full_name?.trim() || ownerProfile.email || "Owner",
    },
  };
}

async function recordAttempt(email: string, ipHash: string | undefined, success: boolean) {
  if (!isSupabaseConfigured) return;
  try {
    await getServiceClient()
      .from("login_attempts")
      .insert({
        identifier: hashIdentifier(email.toLowerCase()),
        ip_hash: ipHash ?? null,
        success,
      });
  } catch (error) {
    // Auditing must never block authentication.
    console.warn("[auth] could not record login attempt:", error);
  }
}

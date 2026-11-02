import "server-only";
import type { Paginated, Property } from "@/lib/types";

/**
 * Public pages must survive a database that is unreachable, paused (Supabase
 * pauses free projects after a period of inactivity) or not migrated yet.
 *
 * A designed empty state with the brand chrome beats a 500 for a visitor, and
 * the failure is still logged loudly so the operator sees it in the platform
 * logs. Studio pages deliberately do NOT use this — an owner must see the real
 * error when a write or a private read fails.
 */
export async function safeData<T>(label: string, promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    console.error(`[data] ${label} unavailable:`, error instanceof Error ? error.message : error);
    return fallback;
  }
}

export function emptyPage(pageSize = 9): Paginated<Property> {
  return { items: [], total: 0, page: 1, pageSize, pageCount: 1 };
}

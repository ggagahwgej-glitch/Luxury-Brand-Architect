"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

/**
 * Boundary for public pages. The site header/footer stay in place (they live in
 * the segment layout above this file), so a failed data fetch never drops the
 * visitor into a bare white screen.
 */
export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[public] route error:", error);
  }, [error]);

  return (
    <div className="shell flex min-h-[62vh] items-center py-24">
      <div className="max-w-xl">
        <p className="eyebrow">Unexpected interruption</p>
        <h1 className="mt-6 text-display-md text-ivory">This page could not be completed.</h1>
        <p className="mt-5 text-[0.95rem] leading-relaxed text-silver">
          The collection may be briefly unavailable. Retry in a moment, or continue browsing from the register.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <button type="button" onClick={reset} className="btn-gold">
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
            Try again
          </button>
          <Link href="/properties" className="btn-ivory">
            Browse properties
          </Link>
        </div>
        {error.digest ? <p className="mt-6 text-[0.65rem] text-silver/40">Reference: {error.digest}</p> : null}
      </div>
    </div>
  );
}

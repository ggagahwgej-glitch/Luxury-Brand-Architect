"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Boundary for the sections that sit outside the Studio shell (sign-in, the
 * Studio root redirect). Keeps the owner inside a styled surface with a way out.
 */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[admin] route error:", error);
  }, [error]);

  return (
    <main id="main-content" className="flex min-h-dvh items-center justify-center bg-obsidian px-6 py-24">
      <div className="w-full max-w-md border border-white/[0.08] bg-imperial/80 p-8 text-center">
        <p className="eyebrow justify-center">Owner Studio</p>
        <h1 className="mt-6 font-serif text-2xl text-ivory">The Studio could not open.</h1>
        <p className="mt-4 text-sm leading-relaxed text-silver">
          A request failed before the page finished loading. Retry, or reload the sign-in screen.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={reset} className="btn-gold btn-sm">
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
            Try again
          </button>
          <a href="/admin/login" className="btn-dark btn-sm">
            Sign in
          </a>
        </div>
        {error.digest ? <p className="mt-5 text-[0.62rem] text-silver/40">Reference: {error.digest}</p> : null}
      </div>
    </main>
  );
}

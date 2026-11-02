"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Error boundary inside the Studio shell: the sidebar and owner identity stay
 * visible, so a failed query reads as a recoverable panel rather than a crash.
 */
export default function StudioError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[studio] route error:", error);
  }, [error]);

  return (
    <div className="panel p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-sm border border-danger/30 bg-danger/10 text-danger">
          <AlertTriangle aria-hidden="true" className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-serif text-xl text-ivory">This view did not load.</h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-silver">
            The request failed before the data arrived. Nothing was changed. Retry the view, or move to another
            section of the Studio.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={reset} className="btn-gold btn-sm">
              <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
              Retry
            </button>
            <a href="/admin/dashboard" className="btn-dark btn-sm">
              Back to dashboard
            </a>
          </div>
          {error.digest ? <p className="mt-4 text-[0.62rem] text-silver/40">Reference: {error.digest}</p> : null}
        </div>
      </div>
    </div>
  );
}

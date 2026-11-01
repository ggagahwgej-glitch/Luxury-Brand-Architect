"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app] unhandled error:", error);
  }, [error]);

  return (
    <main id="main-content" className="flex min-h-dvh items-center justify-center bg-imperial px-6 py-24">
      <div className="max-w-xl text-center">
        <p className="eyebrow justify-center">Unexpected interruption</p>
        <h1 className="mt-6 text-display-md text-ivory">Something did not load as it should.</h1>
        <p className="mt-5 text-[0.95rem] leading-relaxed text-silver">
          The page encountered an error. You can retry, or return to the collection while we look into it.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <button type="button" onClick={reset} className="btn-gold">
            Try again
          </button>
          <a href="/" className="btn-ivory">
            Return home
          </a>
        </div>
        {error.digest ? <p className="mt-6 text-[0.65rem] text-silver/40">Reference: {error.digest}</p> : null}
      </div>
    </main>
  );
}

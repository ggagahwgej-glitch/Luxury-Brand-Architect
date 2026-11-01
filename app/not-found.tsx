import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Page not found", robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <main id="main-content" className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-imperial px-6 py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_400px_at_50%_-10%,rgba(198,164,90,0.12),transparent_70%)]" />
      <div className="relative max-w-xl text-center">
        <p className="eyebrow justify-center">Error 404</p>
        <h1 className="mt-6 text-display-lg text-ivory">This address is not on our register.</h1>
        <p className="mt-5 text-[0.95rem] leading-relaxed text-silver">
          The page you were looking for may have been moved, or the property may no longer be listed.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link href="/properties" className="btn-gold">
            Browse properties
          </Link>
          <Link href="/" className="btn-ivory">
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
}

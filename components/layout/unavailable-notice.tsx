import Link from "next/link";
import { MessageCircle, RefreshCw } from "lucide-react";

/**
 * Shown when a public page cannot reach the database (paused project, outage,
 * schema not applied yet). Deliberately calm and branded — never a stack trace.
 */
export function UnavailableNotice({
  title = "This page is briefly unavailable.",
  description = "We could not reach the property register just now. Nothing is lost — please try again in a moment, or speak to an advisor directly.",
  whatsappHref,
}: {
  title?: string;
  description?: string;
  whatsappHref?: string | null;
}) {
  return (
    <main id="main-content" className="relative flex min-h-[70vh] items-center bg-imperial px-6 py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_360px_at_50%_-10%,rgba(198,164,90,0.10),transparent_70%)]" />
      <div className="shell relative max-w-xl">
        <p className="eyebrow">Temporary interruption</p>
        <h1 className="mt-6 text-display-md text-ivory">{title}</h1>
        <p className="mt-5 text-[0.95rem] leading-relaxed text-silver">{description}</p>
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link href="/properties" className="btn-gold">
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
            Try the register again
          </Link>
          {whatsappHref ? (
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="btn-ivory">
              <MessageCircle aria-hidden="true" className="h-3.5 w-3.5" />
              WhatsApp an advisor
            </a>
          ) : (
            <Link href="/contact" className="btn-ivory">
              Contact us
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

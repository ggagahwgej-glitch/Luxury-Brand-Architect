import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Monogram + wordmark. Rendered as inline SVG so it stays crisp at any size and
 * needs no network request. When the owner uploads a logo it replaces the mark.
 */
export function BrandMark({
  businessName,
  tagline,
  logoUrl,
  monochrome = false,
  className,
  size = "md",
}: {
  businessName: string;
  tagline?: string;
  logoUrl?: string | null;
  monochrome?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dimensions = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const titleSize = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";

  return (
    <Link
      href="/"
      aria-label={`${businessName} — home`}
      className={cn("group flex items-center gap-3.5 outline-offset-4", className)}
    >
      {logoUrl ? (
        // Owner-uploaded logos are served from Supabase Storage or /uploads.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={businessName} className={cn(dimensions, "object-contain")} />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "relative grid place-items-center border transition-colors duration-500",
            dimensions,
            monochrome
              ? "border-white/25 group-hover:border-gold/60"
              : "border-gold/45 group-hover:border-gold",
          )}
        >
          <svg viewBox="0 0 40 40" className="h-[58%] w-[58%]" fill="none" aria-hidden="true">
            <path d="M20 5 32.5 34h-5.1L20 16.4 12.6 34H7.5L20 5Z" fill="currentColor" className="text-gold" />
            <path d="M14.6 26.6h10.8" stroke="currentColor" strokeWidth="1.6" className="text-gold/80" />
          </svg>
          <span className="pointer-events-none absolute inset-[3px] border border-gold/15" />
        </span>
      )}
      <span className="flex flex-col leading-none">
        <span className={cn("font-display tracking-[0.16em] text-ivory", titleSize)}>
          {businessName.toUpperCase()}
        </span>
        {tagline ? (
          <span className="mt-1.5 text-[0.55rem] uppercase tracking-[0.32em] text-gold/75">{tagline}</span>
        ) : null}
      </span>
    </Link>
  );
}

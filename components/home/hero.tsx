import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ShieldCheck, Sparkles, KeyRound } from "lucide-react";
import { SearchPanel } from "@/components/property/search-panel";
import type { LocationFacet, SiteSettings } from "@/lib/types";

/** Section 1 — cinematic hero with the working search panel. */
export function HomeHero({
  settings,
  locations,
  heroImage,
}: {
  settings: SiteSettings;
  locations: LocationFacet[];
  heroImage: string;
}) {
  const { website, branding } = settings;
  const [firstLine, secondLine] = splitHeading(website.heroHeading);

  return (
    <section className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden bg-imperial">
      <Image
        src={heroImage}
        alt={website.heroImageAlt || "Luxury residence at dusk"}
        fill
        priority
        sizes="100vw"
        quality={82}
        className="pointer-events-none absolute inset-0 -z-20 object-cover opacity-95 [animation:ken-burns_28s_ease-out_both] motion-reduce:animate-none"
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(8,9,13,0.86)_0%,rgba(8,9,13,0.35)_38%,rgba(8,9,13,0.72)_72%,rgba(8,9,13,0.98)_100%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_85%_10%,transparent_0%,rgba(8,9,13,0.55)_60%,rgba(8,9,13,0.9)_100%)]" />
      <div className="grain pointer-events-none absolute inset-0 -z-10" />

      <div className="shell relative w-full pb-10 pt-36 sm:pt-40 lg:pb-12">
        <p className="eyebrow animate-fade-in">{website.heroEyebrow || branding.tagline}</p>

        <h1 className="mt-7 max-w-5xl animate-fade-up text-display-xl text-ivory text-shadow-luxe">
          {firstLine}
          {secondLine ? (
            <>
              <br className="hidden sm:block" />{" "}
              <span className="italic text-gold-soft">{secondLine}</span>
            </>
          ) : null}
        </h1>

        <p
          className="mt-7 max-w-xl animate-fade-up text-[0.98rem] leading-relaxed text-ivory/75 [animation-delay:120ms]"
          style={{ animationDelay: "120ms" }}
        >
          {website.heroDescription}
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link href="/properties" className="btn-gold">
            Explore Properties
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <Link href="/categories" className="btn-ivory">
            Discover Our Collection
          </Link>
        </div>

        <div className="mt-14 lg:mt-20">
          <SearchPanel locations={locations} />
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-6 border-t border-white/[0.08] pt-6">
          <ul className="flex flex-wrap items-center gap-x-8 gap-y-3 text-[0.6rem] uppercase tracking-[0.2em] text-ivory/50">
            <li className="flex items-center gap-2">
              <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-gold/70" /> Verified titles
            </li>
            <li className="flex items-center gap-2">
              <KeyRound aria-hidden="true" className="h-3.5 w-3.5 text-gold/70" /> Private viewings
            </li>
            <li className="flex items-center gap-2">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-gold/70" /> Discreet representation
            </li>
          </ul>
          <a
            href="#brand-introduction"
            className="hidden items-center gap-2 text-[0.6rem] uppercase tracking-[0.24em] text-ivory/45 transition-colors hover:text-gold sm:flex"
          >
            Scroll to discover
            <ArrowDown aria-hidden="true" className="h-3.5 w-3.5 animate-bounce" />
          </a>
        </div>
      </div>
    </section>
  );
}

/**
 * Splits the hero heading into two balanced lines at the last sentence-ish
 * break so both lines feel intentional rather than wrapped arbitrarily.
 */
function splitHeading(heading: string): [string, string | null] {
  const clean = heading.trim().replace(/\s+/g, " ");
  if (clean.length < 34) return [clean, null];
  const words = clean.split(" ");
  let bestIndex = Math.ceil(words.length / 2);
  let bestDelta = Infinity;
  for (let i = 2; i <= words.length - 2; i += 1) {
    const left = words.slice(0, i).join(" ").length;
    const right = words.slice(i).join(" ").length;
    const delta = Math.abs(left - right);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestIndex = i;
    }
  }
  return [words.slice(0, bestIndex).join(" "), words.slice(bestIndex).join(" ")];
}

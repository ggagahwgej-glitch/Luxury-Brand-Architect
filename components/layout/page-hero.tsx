import type { ReactNode } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

interface PageHeroProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  image?: string | null;
  actions?: ReactNode;
  children?: ReactNode;
  size?: "sm" | "md";
  className?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

/** Shared editorial header used by every inner page for a consistent rhythm. */
export function PageHero({
  eyebrow,
  title,
  description,
  image,
  actions,
  children,
  size = "md",
  className,
  breadcrumbs,
}: PageHeroProps) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden border-b border-white/[0.06] bg-imperial pt-32 sm:pt-36",
        size === "md" ? "pb-16 sm:pb-20" : "pb-12 sm:pb-14",
        className,
      )}
    >
      {image ? (
        <>
          <Image
            src={image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="pointer-events-none absolute inset-0 -z-10 object-cover opacity-[0.22]"
          />
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-imperial/85 via-imperial/70 to-imperial" />
        </>
      ) : null}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

      <div className="shell">
        {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
        {eyebrow ? <p className="eyebrow mb-5">{eyebrow}</p> : null}
        <h1 className="max-w-4xl text-display-lg text-ivory">{title}</h1>
        {description ? (
          <p className="mt-6 max-w-2xl text-[0.95rem] leading-relaxed text-silver/85">{description}</p>
        ) : null}
        {actions ? <div className="mt-9 flex flex-wrap items-center gap-4">{actions}</div> : null}
        {children ? <div className="mt-10">{children}</div> : null}
      </div>
    </section>
  );
}

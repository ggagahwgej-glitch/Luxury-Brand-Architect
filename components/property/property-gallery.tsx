"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PropertyMedia } from "@/lib/types";

interface GalleryProps {
  images: PropertyMedia[];
  title: string;
  fallbackAlt: string;
}

/**
 * Property gallery with thumbnail navigation, a fullscreen viewer, keyboard
 * controls (← → Esc) and touch swipe. No external carousel dependency.
 */
export function PropertyGallery({ images, title, fallbackAlt }: GalleryProps) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const count = images.length;
  // Navigating between two listings keeps this component mounted, so the
  // selected index can point past the end of the shorter gallery.
  const current = Math.min(active, Math.max(0, count - 1));
  const alt = (index: number) => images[index]?.alt?.trim() || `${title} — ${fallbackAlt}`;

  useEffect(() => {
    setActive((value) => (count && value > count - 1 ? 0 : value));
  }, [count]);

  const go = useCallback(
    (direction: number) => {
      if (!count) return;
      setActive((current) => (current + direction + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (!lightbox) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(false);
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [lightbox, go]);

  if (!count) {
    return (
      <div className="flex aspect-[16/10] w-full items-center justify-center border border-white/[0.08] bg-gradient-to-br from-charcoal to-imperial">
        <div className="text-center">
          <p className="font-display text-2xl text-ivory/70">Imagery being prepared</p>
          <p className="mt-2 text-[0.7rem] uppercase tracking-[0.2em] text-silver/45">
            Official photography will be published shortly
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <div
          className="group relative aspect-[4/3] w-full overflow-hidden border border-white/[0.08] bg-charcoal sm:aspect-[16/10]"
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            if (touchStartX.current === null) return;
            const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
            if (Math.abs(delta) > 48) go(delta < 0 ? 1 : -1);
            touchStartX.current = null;
          }}
        >
          {images.map((image, index) => (
            <Image
              key={image.id}
              src={image.url}
              alt={alt(index)}
              fill
              priority={index === 0}
              sizes="(min-width: 1280px) 70vw, 100vw"
              className={cn(
                "object-cover transition-opacity duration-700 ease-luxe",
                index === current ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            />
          ))}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-imperial/50 via-transparent to-imperial/20" />

          <button
            type="button"
            onClick={() => setLightbox(true)}
            className="absolute right-4 top-4 flex items-center gap-2 border border-white/20 bg-imperial/70 px-3 py-2 text-[0.6rem] uppercase tracking-[0.2em] text-ivory backdrop-blur transition-colors hover:border-gold/60 hover:text-gold"
            aria-label="Open fullscreen image viewer"
          >
            <Expand aria-hidden="true" className="h-3.5 w-3.5" />
            View
          </button>

          {count > 1 ? (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center border border-white/20 bg-imperial/60 text-ivory opacity-0 backdrop-blur transition-all duration-300 hover:border-gold/60 hover:text-gold focus-visible:opacity-100 group-hover:opacity-100 sm:left-4"
              >
                <ChevronLeft aria-hidden="true" className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next image"
                className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center border border-white/20 bg-imperial/60 text-ivory opacity-0 backdrop-blur transition-all duration-300 hover:border-gold/60 hover:text-gold focus-visible:opacity-100 group-hover:opacity-100 sm:right-4"
              >
                <ChevronRight aria-hidden="true" className="h-5 w-5" />
              </button>
              <p className="absolute bottom-4 right-4 border border-white/15 bg-imperial/70 px-2.5 py-1 text-[0.62rem] tracking-[0.18em] text-ivory/80 backdrop-blur">
                {String(current + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
              </p>
            </>
          ) : null}
        </div>

        {count > 1 ? (
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show image ${index + 1}`}
                aria-current={index === current}
                className={cn(
                  "relative h-16 w-24 shrink-0 overflow-hidden border transition-all duration-300 sm:h-20 sm:w-32",
                  index === current
                    ? "border-gold opacity-100"
                    : "border-white/10 opacity-60 hover:border-white/30 hover:opacity-100",
                )}
              >
                <Image src={image.url} alt="" fill sizes="128px" className="object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {lightbox ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} image viewer`}
          className="fixed inset-0 z-[80] flex flex-col bg-imperial/98 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
            <p className="text-[0.66rem] uppercase tracking-[0.24em] text-silver/60">
              {title} · {String(current + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
            </p>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setLightbox(false)}
              aria-label="Close image viewer"
              className="grid h-10 w-10 place-items-center border border-white/15 text-ivory transition-colors hover:border-gold/60 hover:text-gold"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>

          <div
            className="relative flex-1"
            onTouchStart={(event) => {
              touchStartX.current = event.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              if (touchStartX.current === null) return;
              const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
              if (Math.abs(delta) > 48) go(delta < 0 ? 1 : -1);
              touchStartX.current = null;
            }}
          >
            <Image
              src={images[current]?.url ?? images[0]!.url}
              alt={alt(current)}
              fill
              sizes="100vw"
              className="object-contain p-4 sm:p-8"
              priority
            />
            {count > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center border border-white/20 bg-imperial/70 text-ivory transition-colors hover:border-gold/60 hover:text-gold sm:left-6"
                >
                  <ChevronLeft aria-hidden="true" className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center border border-white/20 bg-imperial/70 text-ivory transition-colors hover:border-gold/60 hover:text-gold sm:right-6"
                >
                  <ChevronRight aria-hidden="true" className="h-6 w-6" />
                </button>
              </>
            ) : null}
          </div>

          <div className="no-scrollbar flex gap-2 overflow-x-auto border-t border-white/[0.08] px-4 py-4">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show image ${index + 1}`}
                className={cn(
                  "relative h-14 w-20 shrink-0 overflow-hidden border transition-all sm:h-16 sm:w-24",
                  index === current ? "border-gold" : "border-white/10 opacity-60 hover:opacity-100",
                )}
              >
                <Image src={image.url} alt="" fill sizes="96px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

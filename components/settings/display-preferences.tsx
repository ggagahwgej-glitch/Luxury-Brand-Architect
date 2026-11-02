"use client";

import { useEffect, useState } from "react";
import { Accessibility, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "aurum:reduce-motion";

/** Genuine, persisted display preference — respected by every animation. */
export function DisplayPreferences() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) === "true";
    setReduceMotion(stored);
    document.documentElement.dataset.reduceMotion = stored ? "true" : "false";
    setReady(true);
  }, []);

  function toggle() {
    const next = !reduceMotion;
    setReduceMotion(next);
    window.localStorage.setItem(STORAGE_KEY, String(next));
    document.documentElement.dataset.reduceMotion = next ? "true" : "false";
  }

  return (
    <div className="flex items-start justify-between gap-6 border border-white/[0.08] bg-navy/25 p-5">
      <div className="flex gap-3">
        <Accessibility aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-gold/70" />
        <div>
          <p className="text-[0.8rem] text-ivory">Reduce motion</p>
          <p className="mt-1 max-w-sm text-[0.74rem] leading-relaxed text-silver/60">
            Disables scroll-reveal and page fades across the site. Your system-level reduced-motion setting is always
            respected regardless of this preference.
          </p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={reduceMotion}
        aria-label="Reduce motion"
        onClick={toggle}
        disabled={!ready}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full border transition-colors",
          reduceMotion ? "border-gold bg-gold/25" : "border-white/20 bg-imperial",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full transition-all duration-300",
            reduceMotion ? "left-6 bg-gold text-imperial" : "left-1 bg-silver/60 text-transparent",
          )}
        >
          <Check aria-hidden="true" className="h-3 w-3" />
        </span>
      </button>
    </div>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  tone = "light",
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  tone?: "light" | "dark";
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center border border-dashed px-6 py-16 text-center",
        tone === "dark" ? "border-white/10 bg-white/[0.015]" : "border-white/12 bg-navy/25",
        className,
      )}
    >
      {icon ? <div className="mb-5 text-gold/70">{icon}</div> : null}
      <h3 className={cn("font-display text-2xl", tone === "dark" ? "text-ivory" : "text-ivory")}>{title}</h3>
      {description ? <p className="mt-3 max-w-md text-sm leading-relaxed text-silver">{description}</p> : null}
      {action ? <div className="mt-7">{action}</div> : null}
    </div>
  );
}

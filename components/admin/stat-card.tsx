import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  href,
  hint,
  emphasis = false,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  href?: string;
  hint?: string;
  emphasis?: boolean;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "grid h-9 w-9 place-items-center border",
            emphasis ? "border-gold/40 bg-gold/10 text-gold" : "border-white/10 text-silver/60",
          )}
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
        {href ? <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 text-silver/25" /> : null}
      </div>
      <p className="mt-5 font-display text-3xl leading-none text-ivory">{value}</p>
      <p className="mt-2 text-[0.62rem] uppercase tracking-[0.16em] text-silver/50">{label}</p>
      {hint ? <p className="mt-2 text-[0.66rem] text-gold/70">{hint}</p> : null}
    </>
  );

  const className = cn(
    "block border p-4 transition-colors",
    emphasis
      ? "border-gold/20 bg-gradient-to-b from-gold/[0.06] to-transparent hover:border-gold/40"
      : "border-white/[0.07] bg-[#0d1017] hover:border-white/20",
  );

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

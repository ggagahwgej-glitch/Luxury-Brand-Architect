import { cn } from "@/lib/utils";
import { STATUS_LABELS, STATUS_TONES } from "@/lib/constants";
import type { PropertyStatus } from "@/lib/types";

const tones = {
  gold: "border-gold/40 bg-gold/10 text-gold-soft",
  success: "border-success/40 bg-success/10 text-[#8fd4b8]",
  neutral: "border-white/15 bg-white/5 text-silver",
  danger: "border-danger/40 bg-danger/10 text-[#e6a3a3]",
} as const;

export function Badge({
  children,
  tone = "gold",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return <span className={cn("badge", tones[tone], className)}>{children}</span>;
}

export function StatusBadge({ status, className }: { status: PropertyStatus; className?: string }) {
  return (
    <Badge tone={STATUS_TONES[status]} className={className}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function FeaturedBadge({ className }: { className?: string }) {
  return <Badge tone="gold" className={cn("backdrop-blur", className)}>Signature</Badge>;
}
